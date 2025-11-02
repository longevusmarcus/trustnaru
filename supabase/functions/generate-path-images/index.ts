import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = '';
  for (let i = 0; i < buf.length; i++) {
    binary += String.fromCharCode(buf[i]);
  }
  return btoa(binary);
}

async function generateWithGemini(prompt: string, refB64: string, mime = 'image/jpeg'): Promise<string> {
  const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_KEY) throw new Error('Missing GEMINI_API_KEY');

  const MODEL = 'gemini-2.5-flash-image-preview';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'x-goog-api-key': GEMINI_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${prompt}\nUse the provided image as the subject. Preserve the same identity strictly. Make it photorealistic and professional.` },
            { inline_data: { mime_type: mime, data: refB64 } },
          ],
        },
      ],
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`Gemini error ${resp.status}: ${t}`);
  }

  const json = await resp.json();
  const parts = json?.candidates?.[0]?.content?.parts || [];

  for (const p of parts) {
    if (p?.inlineData?.data) {
      const mt = p.inlineData.mimeType || 'image/png';
      return `data:${mt};base64,${p.inlineData.data}`;
    }
    if (p?.inline_data?.data) {
      const mt = p.inline_data.mime_type || 'image/png';
      return `data:${mt};base64,${p.inline_data.data}`;
    }
  }

  throw new Error('No image returned by Gemini');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const { pathId } = await req.json();

    // Get the career path
    const { data: careerPath, error: pathError } = await supabaseClient
      .from('career_paths')
      .select('*')
      .eq('id', pathId)
      .single();

    if (pathError || !careerPath) {
      throw new Error('Career path not found');
    }

    // Get user's uploaded reference photo
    const { data: userPhotos } = await supabaseClient
      .from('user_photos')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_reference', true)
      .limit(1);

    if (!userPhotos || userPhotos.length === 0) {
      throw new Error('No reference photo found');
    }

    const bestPhotoUrl = userPhotos[0].photo_url;
    const refB64 = await urlToBase64(bestPhotoUrl);
    const refMime = bestPhotoUrl.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    // Generate image prompt
    const roleTitle = careerPath.title;
    const lifestyle = careerPath.lifestyle_benefits?.join(', ') || 'professional fulfillment';
    const keySkills = careerPath.key_skills?.join(', ') || 'their expertise';

    const imagePrompt = `Generate a ultra-photorealistic professional scene showing this person as a ${roleTitle}, demonstrating ${keySkills}. The scene should convey ${lifestyle}. Professional lighting, editorial style, 50mm f/1.8, soft natural light. The person should look confident and successful in this role.`;

    console.log('Generating image with prompt:', imagePrompt);

    await sleep(1500); // Rate limiting

    const dataUrl = await generateWithGemini(imagePrompt, refB64, refMime);

    // Update career path with image
    const { error: updateError } = await supabaseClient
      .from('career_paths')
      .update({ image_url: dataUrl })
      .eq('id', pathId);

    if (updateError) {
      console.error('Error updating career path with image:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, imageUrl: dataUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating path image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
