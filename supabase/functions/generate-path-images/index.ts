import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function generateWithGemini(prompt: string, refImageBase64: string, maxRetries = 1): Promise<Uint8Array> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) throw new Error('Missing GEMINI_API_KEY secret');

  // Simplified prompt without strict identity language to avoid safety filters
  const fullPrompt = `${prompt}\n\nStyle: Professional photography, high quality, natural lighting.`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}/${maxRetries + 1}`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: fullPrompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: refImageBase64
                  }
                }
              ]
            }],
            generationConfig: {
              response_modalities: ["image"]
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API error ${response.status}:`, errorText);
        throw new Error(`Gemini API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Extract image data from any part using either inlineData or inline_data
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      const imgPart = parts.find((p: any) => p?.inlineData?.data || p?.inline_data?.data);
      const imageData: string | undefined = imgPart?.inlineData?.data ?? imgPart?.inline_data?.data;

      if (!imageData) {
        const summary = {
          candidateCount: data?.candidates?.length ?? 0,
          partKeys: Array.isArray(parts) ? parts.map((p: any) => Object.keys(p)) : [],
        };
        console.error('No image in Gemini response (summary):', summary);
        throw new Error('No image returned by Gemini');
      }

      return Uint8Array.from(atob(imageData), (c) => c.charCodeAt(0));
    } catch (error) {
      console.error(`Attempt ${attempt + 1} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff)
      const waitTime = Math.pow(2, attempt) * 1000;
      console.log(`Waiting ${waitTime}ms before retry...`);
      await sleep(waitTime);
    }
  }

  throw new Error('Failed to generate image after all retries');
}

const constructScenePrompts = (careerPath: any): string[] => {
  const roleTitle = careerPath.title || 'Professional';
  
  // Simplified, generic prompts that are less likely to trigger safety filters
  return [
    `Professional portrait of a ${roleTitle} in a modern office`,
    `${roleTitle} working at desk in contemporary workspace`,
    `${roleTitle} in business meeting with team members`,
    `${roleTitle} in casual professional setting`
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

    // Use signed URL and convert to base64 ONCE (not per image)
    const refImageUrl = signedUrlData.signedUrl;
    console.log('Converting reference image to base64...');
    const refImageBase64 = await urlToBase64(refImageUrl);
    console.log('Reference image converted, size:', refImageBase64.length, 'chars');

    // Generate 4 images per career path
    const scenePrompts = constructScenePrompts(careerPath);
    console.log('Generating career images for:', careerPath.title);

    const allImageUrls: string[] = [];

    // Generate all 4 images using the pre-converted base64
    for (let i = 0; i < scenePrompts.length; i++) {
      const prompt = scenePrompts[i];
      console.log(`Generating image ${i + 1}/4...`);
      
      try {
        const imageBytes = await generateWithGemini(prompt, refImageBase64);
        
        // Upload to storage bucket
        const fileName = `${user.id}/${pathId}-${i + 1}-${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabaseClient
          .storage
          .from('career-images')
          .upload(fileName, imageBytes, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error(`Failed to upload image ${i + 1}:`, uploadError.message);
          continue; // Continue with other images even if one fails
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseClient
          .storage
          .from('career-images')
          .getPublicUrl(fileName);
        
        allImageUrls.push(publicUrl);
        console.log(`Successfully generated image ${i + 1}/4`);
      } catch (imageError) {
        console.error(`Failed to generate image ${i + 1}/4:`, imageError);
        // Continue with other images even if one fails
      }
      
      // Small delay between generations to avoid rate limits
      if (i < scenePrompts.length - 1) {
        await sleep(1500);
      }
    }

    if (allImageUrls.length === 0) {
      throw new Error('Failed to generate any images');
    }

    // Store URLs in database - first image as main, all in array
    const imageData = {
      image_url: allImageUrls[0],
      all_images: allImageUrls
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
        imageUrl: allImageUrls[0],
        allImages: allImageUrls,
        message: `Successfully generated ${allImageUrls.length} career images`
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
