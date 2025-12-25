import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Get all artifacts from database to help AI match
    const { data: artifacts, error: dbError } = await supabase
      .from('artifacts')
      .select('*');

    if (dbError) {
      console.error('Database error:', dbError);
    }

    // Create a list of artifact names for the AI prompt (one per line for reliability)
    const artifactList = artifacts?.map((a) => `- ${a.name}`).join('\n') || '';
    
    console.log('Analyzing artifact image...');
    console.log('Known artifacts in database:', artifactList || '(none)');

    // Step 1: Analyze the artifact image and try to match with database
    const analyzeResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
             content: `You are an expert museum curator and historian specializing in audio and recording technology, especially artifacts from Musée des ondes Emile Berliner.

IMPORTANT: The museum database contains the following artifact names (one per line):
${artifactList || '- (no artifacts registered yet)'}

Matching rules:
- If the photo matches one of the names above, set "matched": true AND set "name" to EXACTLY that database name (copy/paste).
- If you are not confident it's exactly one of those, set "matched": false and provide your best identification in "name".

Provide:
1. Name: The specific name/model of the item (use exact database name if matched)
2. Date: The approximate year or date range 
3. Description: A 2-3 sentence description
4. matched: true if this matches a known database artifact, false otherwise

Respond ONLY in valid JSON format like this:
{"name": "...", "date": "...", "description": "...", "matched": true/false}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this museum artifact and identify it. If it matches any known artifact in the database, use the exact name.'
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
      }),
    });

    if (!analyzeResponse.ok) {
      const errorText = await analyzeResponse.text();
      console.error('AI gateway error:', analyzeResponse.status, errorText);
      
      if (analyzeResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (analyzeResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${analyzeResponse.status}`);
    }

    const data = await analyzeResponse.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI response:', content);

    // Parse the JSON response from the AI
    let artifactInfo;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        artifactInfo = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      artifactInfo = {
        name: 'Unknown Artifact',
        date: 'Unknown date',
        description: content || 'Unable to analyze this artifact.',
        matched: false
      };
    }

    // Step 2: Try to find matching artifact in database (avoid false positives)
    let matchedArtifact: any | null = null;

    const normalizeName = (value: string) =>
      value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const STOPWORDS = new Set(["artifact", "artefact", "unknown", "object", "item", "non", "audio"]);
    const tokenize = (value: string) =>
      normalizeName(value)
        .split(" ")
        .filter(Boolean)
        .filter((t) => !STOPWORDS.has(t));

    const jaccard = (a: string[], b: string[]) => {
      if (a.length === 0 || b.length === 0) return 0;
      const setA = new Set(a);
      const setB = new Set(b);
      let intersection = 0;
      for (const t of setA) if (setB.has(t)) intersection++;
      const union = new Set([...setA, ...setB]).size;
      return union === 0 ? 0 : intersection / union;
    };

    const guessNameRaw = typeof artifactInfo?.name === "string" ? artifactInfo.name : "";
    const guessName = normalizeName(guessNameRaw);

    if (artifactInfo?.matched === true && artifacts && artifacts.length > 0 && guessName) {
      let bestScore = 0;

      for (const a of artifacts) {
        const dbNameRaw = typeof a?.name === "string" ? a.name : "";
        const dbName = normalizeName(dbNameRaw);
        if (!dbName) continue;

        let score = 0;
        if (dbName === guessName) score = 1;
        else if (dbName.includes(guessName) || guessName.includes(dbName)) score = 0.85;
        else score = jaccard(tokenize(dbNameRaw), tokenize(guessNameRaw));

        if (score > bestScore) {
          bestScore = score;
          matchedArtifact = a;
        }
      }

      // Require a strong match to prevent returning the wrong registry photo
      if (bestScore < 0.82) {
        console.log("No confident database match. Best score:", bestScore, "AI name:", guessNameRaw);
        matchedArtifact = null;
      } else {
        console.log("Database match:", matchedArtifact?.name, "score:", bestScore);
      }
    } else {
      console.log("AI did not confirm a database match (matched=false). Skipping DB photo lookup.");
    }

    // If we found a match in database, use database info
    if (matchedArtifact) {
      console.log('Found matching artifact in database:', matchedArtifact.name);
      return new Response(JSON.stringify({
        id: matchedArtifact.id,
        name: matchedArtifact.name,
        date: matchedArtifact.date || artifactInfo.date,
        description: matchedArtifact.description || artifactInfo.description,
        imageUrl: matchedArtifact.photos?.[0] || null,
        photos: matchedArtifact.photos || [],
        fromDatabase: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No match found - return AI analysis without database photo
    console.log('No matching artifact found in database');
    return new Response(JSON.stringify({
      ...artifactInfo,
      fromDatabase: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-artifact:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
