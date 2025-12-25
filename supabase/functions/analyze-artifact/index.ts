import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing artifact image...');

    // Step 1: Analyze the artifact image to get name, date, description
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

When analyzing an artifact image, provide:
1. Name: The specific name/model of the item (e.g., "Berliner Gramophone Model D", "RCA 44-BX Ribbon Microphone")
2. Date: The approximate year or date range when this was manufactured (e.g., "1895", "circa 1930", "1920-1925")
3. Description: A 2-3 sentence description explaining what the artifact is, its historical significance, and how it was used.

Respond ONLY in valid JSON format like this:
{"name": "...", "date": "...", "description": "..."}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please analyze this museum artifact and provide its name, date, and description.'
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
        description: content || 'Unable to analyze this artifact.'
      };
    }

    // Step 2: Generate a beautiful vintage-style image of the artifact
    console.log('Generating artifact image for:', artifactInfo.name);
    
    try {
      const imageGenResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: `Generate a beautiful, high-quality vintage museum photograph of a ${artifactInfo.name} from ${artifactInfo.date}. The image should look like a professional museum catalog photo with dramatic lighting, dark background, and elegant composition. Show the artifact in pristine condition as it would appear in a prestigious museum exhibit.`
            }
          ],
          modalities: ['image', 'text']
        }),
      });

      if (imageGenResponse.ok) {
        const imageData = await imageGenResponse.json();
        const generatedImageUrl = imageData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        
        if (generatedImageUrl) {
          console.log('Generated image successfully');
          artifactInfo.imageUrl = generatedImageUrl;
        }
      } else {
        console.log('Image generation failed, using original image');
      }
    } catch (imageError) {
      console.error('Image generation error:', imageError);
      // Continue without generated image
    }

    return new Response(JSON.stringify(artifactInfo), {
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
