import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch reference image: ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  let binary = '';
  for (let i = 0; i < buf.length; i++) {
    binary += String.fromCharCode(buf[i]);
  }
  return btoa(binary);
}

async function generateWithGemini(prompt: string, refB64: string, mime = 'image/jpeg'): Promise<Uint8Array> {
  const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_KEY) throw new Error('Missing GEMINI_API_KEY secret');

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
            { text: `${prompt}\nUse the provided image as the subject. Preserve the same identity strictly (same face shape, hairline, eye spacing, nose, lips, skin tone, body proportions, natural skin texture). No identity changes. No face swaps. Make it ultra-photorealistic and professional.` },
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
      return Uint8Array.from(atob(p.inlineData.data), c => c.charCodeAt(0));
    }
    if (p?.inline_data?.data) {
      return Uint8Array.from(atob(p.inline_data.data), c => c.charCodeAt(0));
    }
  }

  throw new Error('No image returned by Gemini');
}

const constructScenePrompts = (careerPath: any): string[] => {
  const roleTitle = careerPath.title || 'Professional';
  const lifestyle = Array.isArray(careerPath.lifestyle_benefits) && careerPath.lifestyle_benefits.length
    ? careerPath.lifestyle_benefits.join(', ')
    : 'professional fulfillment';
  const keySkills = Array.isArray(careerPath.key_skills) && careerPath.key_skills.length
    ? careerPath.key_skills.join(', ')
    : 'their expertise';

  return [
    `Professional Scene — Show this person working as a ${roleTitle}, actively demonstrating ${keySkills}. 50mm f/1.8, soft natural light, editorial style, modern professional environment.`,
    `Leadership Moment — Show this person presenting or collaborating as a ${roleTitle}, medium shot, shallow depth of field, professional lighting, confident and engaged.`,
    `Success Lifestyle — Show this person enjoying ${lifestyle}, golden hour wide shot, aspirational but authentic, embodying the rewards of being a ${roleTitle}.`
  ];
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
      .order('created_at', { ascending: false })
      .limit(1);

    if (!userPhotos || userPhotos.length === 0) {
      throw new Error('No reference photo found');
    }

    const photoPath = userPhotos[0].photo_url as string;

    // Normalize path: ensure it's relative to the bucket and has no leading slash
    let objectPath = photoPath.startsWith('user-photos/')
      ? photoPath.substring('user-photos/'.length)
      : photoPath;
    objectPath = objectPath.replace(/^\/+/, '');
    console.log('Attempting to sign reference photo at path:', objectPath);
    
    // Create a signed URL that's accessible by the edge function
    let signedUrlData: { signedUrl: string } | null = null;
    let signedUrlError: any = null;

    const attempt1 = await supabaseClient
      .storage
      .from('user-photos')
      .createSignedUrl(objectPath, 3600); // 1 hour expiry

    if (attempt1?.data) {
      signedUrlData = attempt1.data;
    } else {
      signedUrlError = attempt1?.error;
      console.error('Signed URL attempt 1 failed:', signedUrlError);
      // Fallback: sometimes paths are saved with a leading slash
      const attempt2 = await supabaseClient
        .storage
        .from('user-photos')
        .createSignedUrl(`/${objectPath}`.replace(/\/\//g, '/'), 3600);
      if (attempt2?.data) {
        signedUrlData = attempt2.data;
        signedUrlError = null;
      } else {
        signedUrlError = attempt2?.error;
        console.error('Signed URL attempt 2 failed:', signedUrlError);
      }
    }

    if (!signedUrlData) {
      throw new Error('Failed to access reference photo');
    }

    // Convert signed URL to base64 for Gemini
    const refB64 = await urlToBase64(signedUrlData.signedUrl);
    const refMime = photoPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    // Generate 3 scene variations
    const scenePrompts = constructScenePrompts(careerPath);
    console.log('Generating 3 scene variations for:', careerPath.title);

    const imageUrls: string[] = [];
    
    for (let i = 0; i < scenePrompts.length; i++) {
      console.log(`Generating image ${i + 1}/3...`);
      await sleep(1500); // Rate limiting
      
      try {
        const imageBytes = await generateWithGemini(scenePrompts[i], refB64, refMime);
        
        // Upload to storage bucket
        const fileName = `${user.id}/${pathId}-${i}-${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabaseClient
          .storage
          .from('career-images')
          .upload(fileName, imageBytes, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error(`Failed to upload image ${i + 1}:`, uploadError);
          continue;
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseClient
          .storage
          .from('career-images')
          .getPublicUrl(fileName);
        
        imageUrls.push(publicUrl);
        console.log(`Successfully generated and uploaded image ${i + 1}`);
      } catch (imageError) {
        console.error(`Failed to generate image ${i + 1}:`, imageError);
        // Continue with other images even if one fails
      }
    }

    if (imageUrls.length === 0) {
      throw new Error('Failed to generate any images');
    }

    // Store URLs instead of base64
    const imageData = {
      image_url: imageUrls[0],
      all_images: imageUrls
    };

    const { error: updateError } = await supabaseClient
      .from('career_paths')
      .update(imageData)
      .eq('id', pathId);

    if (updateError) {
      console.error('Error updating career path with images:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        imageUrl: imageUrls[0],
        allImages: imageUrls,
        message: `Generated ${imageUrls.length} scene variations`
      }),
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
