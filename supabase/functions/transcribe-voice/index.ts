import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const inputSchema = z.object({
  audio: z.string().min(1, "Audio data required").max(10 * 1024 * 1024, "Audio file too large (max 10MB)")
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const validated = inputSchema.parse(body);
    const { audio } = validated;
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is not configured');
      throw new Error('SERVICE_UNAVAILABLE');
    }

    console.log('Processing audio transcription with Gemini...');
    console.log('Audio data length:', audio.length);

    // Detect mime type from base64 header or default to webm
    let mimeType = "audio/webm";
    if (audio.startsWith('data:')) {
      const match = audio.match(/^data:([^;]+);base64,/);
      if (match) {
        mimeType = match[1];
        // Remove data URL prefix to get raw base64
        console.log('Detected mime type from data URL:', mimeType);
      }
    }
    
    // Clean the base64 data - remove any data URL prefix if present
    const cleanedAudio = audio.replace(/^data:[^;]+;base64,/, '');
    console.log('Cleaned audio data length:', cleanedAudio.length);
    console.log('Using mime type:', mimeType);

    // Use Gemini 2.5 Flash for audio transcription
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: "Please transcribe this audio accurately. Return only the transcribed text without any additional commentary or formatting."
              },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: cleanedAudio
                }
              }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      console.error('Request mime_type:', mimeType);
      console.error('Audio data preview (first 100 chars):', cleanedAudio.substring(0, 100));
      throw new Error('TRANSCRIPTION_FAILED');
    }

    const result = await response.json();
    console.log('Transcription successful');
    
    const transcription = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return new Response(
      JSON.stringify({ text: transcription }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in transcribe-voice function:', error);
    
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: 'Invalid request format' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const errorMessage = error instanceof Error && error.message === 'SERVICE_UNAVAILABLE'
      ? 'Service temporarily unavailable'
      : 'Unable to process audio';
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
