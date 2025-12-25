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

    // Create a list of artifact names for the AI prompt
    const artifactNames = artifacts?.map(a => a.name).join(', ') || '';
    
    console.log('Analyzing artifact image...');
    console.log('Known artifacts in database:', artifactNames);

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

IMPORTANT: The museum has these artifacts in their database: ${artifactNames || 'No artifacts registered yet'}

When analyzing an artifact image:
1. Try to identify if it matches any of the known artifacts listed above
2. If it matches a known artifact, use EXACTLY the same name as in the database
3. If it's not in the database, provide your best identification

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

    // Step 2: Try to find matching artifact in database
    let matchedArtifact = null;
    if (artifacts && artifacts.length > 0) {
      // First try exact match
      matchedArtifact = artifacts.find(a => 
        a.name.toLowerCase() === artifactInfo.name.toLowerCase()
      );
      
      // If no exact match, try partial match
      if (!matchedArtifact) {
        matchedArtifact = artifacts.find(a => 
          a.name.toLowerCase().includes(artifactInfo.name.toLowerCase()) ||
          artifactInfo.name.toLowerCase().includes(a.name.toLowerCase())
        );
      }
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
