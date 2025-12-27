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

    // Create a list of artifacts with their reference photos for visual comparison
    const artifactListWithPhotos = artifacts?.map((a) => {
      const photoUrls = a.photos?.length > 0 
        ? a.photos.slice(0, 3).join(', ')  // Limit to 3 photos per artifact
        : '(no reference photos)';
      return `- "${a.name}" | Reference photos: ${photoUrls}`;
    }).join('\n') || '';
    
    console.log('Analyzing artifact image with visual comparison...');
    console.log('Known artifacts with photos:', artifacts?.length || 0);

    // Build the content array with scanned image + reference photos for visual comparison
    const messageContent: any[] = [
      {
        type: 'text',
        text: `You are analyzing a museum artifact photo. Compare it VISUALLY against the reference photos provided below.

IMPORTANT: This is a VISUAL COMPARISON task. Look at the actual images, not just names.

Known museum artifacts with reference photos:
${artifactListWithPhotos || '(no artifacts registered yet)'}

INSTRUCTIONS:
1. Examine the scanned image carefully
2. Compare it visually against the reference photos listed above
3. If you find a VISUAL MATCH with one of the reference photos, set "matched": true and use the EXACT artifact name
4. If no visual match is found, set "matched": false and provide your best identification

Respond ONLY in valid JSON:
{"name": "...", "date": "...", "description": "...", "matched": true/false, "confidence": "high/medium/low", "matchReason": "brief explanation of why this matched or didn't match"}`
      },
      {
        type: 'text',
        text: 'SCANNED IMAGE TO IDENTIFY:'
      },
      {
        type: 'image_url',
        image_url: { url: imageUrl }
      }
    ];

    // Add reference photos from database artifacts for direct visual comparison
    if (artifacts && artifacts.length > 0) {
      messageContent.push({
        type: 'text',
        text: '\n\nREFERENCE PHOTOS FROM DATABASE (compare the scanned image against these):'
      });

      for (const artifact of artifacts) {
        if (artifact.photos && artifact.photos.length > 0) {
          // Add label for this artifact's photos
          messageContent.push({
            type: 'text',
            text: `\n--- ${artifact.name} ---`
          });
          
          // Add up to 2 reference photos per artifact to avoid token limits
          for (const photoUrl of artifact.photos.slice(0, 2)) {
            if (photoUrl && typeof photoUrl === 'string') {
              messageContent.push({
                type: 'image_url',
                image_url: { url: photoUrl }
              });
            }
          }
        }
      }
    }

    // Step 1: Analyze with visual comparison
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
            role: 'user',
            content: messageContent
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
