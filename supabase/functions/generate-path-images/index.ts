import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateWithLovableAI(prompt: string, refImageUrl: string, maxRetries = 2): Promise<Uint8Array> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('Missing LOVABLE_API_KEY secret');

  const fullPrompt = `${prompt}\n\nUse the provided image as the subject. Preserve the same identity strictly (same face shape, hairline, eye spacing, nose, lips, skin tone, body proportions, natural skin texture). No identity changes. No face swaps. Make it ultra-photorealistic and professional.`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}/${maxRetries + 1} to generate image`);
      
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: fullPrompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: refImageUrl
                  }
                }
              ]
            }
          ],
          modalities: ["image", "text"]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error ${response.status}:`, errorText);
        throw new Error(`API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!imageUrl) {
        console.error('No image in response:', JSON.stringify(data));
        throw new Error('No image returned in API response');
      }

      // Extract base64 data from data URL
      if (!imageUrl.startsWith('data:image/')) {
        throw new Error('Invalid image URL format');
      }

      const base64Data = imageUrl.split(',')[1];
      if (!base64Data) {
        throw new Error('Failed to extract base64 data from image URL');
      }

      return Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
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
  const lifestyle = Array.isArray(careerPath.lifestyle_benefits) && careerPath.lifestyle_benefits.length
    ? careerPath.lifestyle_benefits.join(', ')
    : 'professional fulfillment';
  const keySkills = Array.isArray(careerPath.key_skills) && careerPath.key_skills.length
    ? careerPath.key_skills.join(', ')
    : 'their expertise';
  const targetCompanies = Array.isArray(careerPath.target_companies) && careerPath.target_companies.length
    ? careerPath.target_companies[0]
    : 'a leading company';

  return [
    `Hero Professional Portrait — Show this person as a ${roleTitle}, confident headshot to mid-torso, 85mm f/1.4, soft directional lighting, professional yet approachable, modern workspace background slightly blurred, editorial quality.`,
    `At Work Scene — Show this person actively working as a ${roleTitle}, demonstrating ${keySkills}, 50mm f/1.8, natural office lighting, dynamic composition, authentic work environment.`,
    `Leadership & Collaboration — Show this person in a meeting or presentation as a ${roleTitle}, medium shot, confident body language, professional lighting, modern office setting.`,
    `Lifestyle Aspiration — Show this person enjoying ${lifestyle}, golden hour lighting, wide environmental shot, aspirational lifestyle that comes with being a ${roleTitle}, relaxed and fulfilled.`
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

    // Use signed URL directly for the AI API
    const refImageUrl = signedUrlData.signedUrl;

    // Generate 4 images per career path
    const scenePrompts = constructScenePrompts(careerPath);
    console.log('Generating 4 career images for:', careerPath.title);

    const allImageUrls: string[] = [];

    // Generate all 4 images
    for (let i = 0; i < scenePrompts.length; i++) {
      const prompt = scenePrompts[i];
      console.log(`Generating image ${i + 1}/4...`);
      
      try {
        const imageBytes = await generateWithLovableAI(prompt, refImageUrl);
        
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
