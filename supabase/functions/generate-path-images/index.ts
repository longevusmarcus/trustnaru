import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

async function generateWithGemini(prompt: string, refImageBase64: string, maxRetries = 1): Promise<Uint8Array> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY secret");

  // Simplified prompt without strict identity language to avoid safety filters
  const fullPrompt = `${prompt}\n\nStyle: Professional photography, high quality, natural lighting.`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt + 1}/${maxRetries + 1}`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: fullPrompt },
                  {
                    inline_data: {
                      mime_type: "image/jpeg",
                      data: refImageBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              response_modalities: ["image"],
            },
          }),
        },
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
        console.error("No image in Gemini response (summary):", summary);
        throw new Error("No image returned by Gemini");
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

  throw new Error("Failed to generate image after all retries");
}

const constructScenePrompts = (careerPath: any, existingImageCount: number = 0): string[] => {
  const roleTitle = careerPath.title || "Professional";
  const keySkills = careerPath.key_skills?.slice(0, 2).join(", ") || "professional skills";
  const lifestyle = careerPath.lifestyle_benefits?.[0] || "successful professional lifestyle";

  // First set of images (initial generation)
  if (existingImageCount === 0) {
    return [
      // 1) Professional Scene - working as the role
      `HYPERREALISTIC professional photograph of a ${roleTitle} actively working, demonstrating ${keySkills}. Shot on Canon EOS R5, 50mm f/1.4 lens, natural window lighting, shallow depth of field. CRITICAL: Use EXACT person from reference photo - identical facial features, skin texture, hair, body type, proportions. NO modifications to face or body. Photojournalistic style capturing authentic work moment. Professional environment with depth and detail.`,

      // 2) Leadership/Collaboration Scene
      `HYPERREALISTIC candid shot of a ${roleTitle} collaborating with colleagues or presenting ideas. Shot on Sony A7R IV, 35mm f/1.8 lens, professional studio lighting setup. CRITICAL: EXACT same person from reference - preserve all facial features, expressions, proportions perfectly. NO alterations. Documentary photography style. Contemporary workplace with realistic details and depth.`,

      // 3) Lifestyle Success Scene
      `HYPERREALISTIC lifestyle photograph of a ${roleTitle} enjoying ${lifestyle}. Shot on Nikon Z9, 85mm f/1.4 lens, golden hour natural lighting. CRITICAL: IDENTICAL person from reference photo - same face, features, skin, hair, body entirely. NO changes whatsoever. Authentic moment, aspirational yet believable. Real-world setting with cinematic composition and shallow depth of field.`,
    ];
  }

  // Alternative set of images (subsequent generations) - different contexts, same person
  return [
    // 1) Outdoor/Travel Scene - different environment
    `HYPERREALISTIC morning portrait of a ${roleTitle} in an outdoor urban or natural setting, casual professional attire. Shot on Fujifilm X-T5, 56mm f/1.2 lens, natural daylight, cinematic depth. CRITICAL: EXACT person from reference photo - identical facial features, skin texture, hair, body type, proportions. NO modifications to face or body. Different clothing style from previous images. Authentic lifestyle moment showing work-life balance.`,

    // 2) Evening/Social Scene - different time and context
    `HYPERREALISTIC evening shot of a ${roleTitle} at a networking event or casual dinner meeting, aligned with ${roleTitle}. Shot on Sony A7R IV, 35mm f/1.8 lens, professional studio lighting setup. CRITICAL: EXACT same person from reference - preserve all facial features, expressions, proportions perfectly. NO alterations. Documentary photography style. Natural social interaction captured authentically.`,

    // 3) Home Office/Creative Scene - different workspace
    `HYPERREALISTIC intimate shot of a ${roleTitle} working from a home office or somewhere in the world in line with ${roleTitle}, comfortable modern clothing. Shot on Canon R6, 35mm f/1.4 lens, soft natural window light, shallow focus. CRITICAL: IDENTICAL person from reference photo - same face, features, skin, hair, body entirely. NO changes whatsoever. Different setting and clothing style showing versatility. Personal, authentic workspace environment with character and depth.`,
  ];
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    });

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const { pathId } = await req.json();

    // Get the career path
    const { data: careerPath, error: pathError } = await supabaseClient
      .from("career_paths")
      .select("*")
      .eq("id", pathId)
      .single();

    if (pathError || !careerPath) {
      throw new Error("Career path not found");
    }

    // Get ALL user's uploaded photos for hyperrealistic generation
    const { data: userPhotos } = await supabaseClient
      .from("user_photos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!userPhotos || userPhotos.length === 0) {
      throw new Error("No reference photo found");
    }

    const photoPath = userPhotos[0].photo_url as string;

    // Normalize path: ensure it's relative to the bucket and has no leading slash
    let objectPath = photoPath.startsWith("user-photos/") ? photoPath.substring("user-photos/".length) : photoPath;
    objectPath = objectPath.replace(/^\/+/, "");
    console.log("Attempting to sign reference photo at path:", objectPath);

    // Create a signed URL that's accessible by the edge function
    let signedUrlData: { signedUrl: string } | null = null;
    let signedUrlError: any = null;

    const attempt1 = await supabaseClient.storage.from("user-photos").createSignedUrl(objectPath, 3600); // 1 hour expiry

    if (attempt1?.data) {
      signedUrlData = attempt1.data;
    } else {
      signedUrlError = attempt1?.error;
      console.error("Signed URL attempt 1 failed:", signedUrlError);
      // Fallback: sometimes paths are saved with a leading slash
      const attempt2 = await supabaseClient.storage
        .from("user-photos")
        .createSignedUrl(`/${objectPath}`.replace(/\/\//g, "/"), 3600);
      if (attempt2?.data) {
        signedUrlData = attempt2.data;
        signedUrlError = null;
      } else {
        signedUrlError = attempt2?.error;
        console.error("Signed URL attempt 2 failed:", signedUrlError);
      }
    }

    if (!signedUrlData) {
      throw new Error("Failed to access reference photo");
    }

    // Convert ALL user photos to base64 for better variety and realism
    console.log(`Converting ${userPhotos.length} reference images to base64...`);
    const allRefImagesBase64: string[] = [];

    for (const photo of userPhotos.slice(0, 3)) {
      // Use up to 3 photos max
      try {
        const photoPath = photo.photo_url as string;
        let objectPath = photoPath.startsWith("user-photos/") ? photoPath.substring("user-photos/".length) : photoPath;
        objectPath = objectPath.replace(/^\/+/, "");

        const { data: signedPhotoUrl } = await supabaseClient.storage
          .from("user-photos")
          .createSignedUrl(objectPath, 3600);

        if (signedPhotoUrl) {
          const photoBase64 = await urlToBase64(signedPhotoUrl.signedUrl);
          allRefImagesBase64.push(photoBase64);
          console.log(`Converted photo ${allRefImagesBase64.length}`);
        }
      } catch (e) {
        console.error("Error converting photo:", e);
      }
    }

    if (allRefImagesBase64.length === 0) {
      // Fallback to original single photo method
      const refImageUrl = signedUrlData.signedUrl;
      const refImageBase64 = await urlToBase64(refImageUrl);
      allRefImagesBase64.push(refImageBase64);
    }

    console.log(`Using ${allRefImagesBase64.length} reference photos for hyperrealistic generation`);

    // Check existing images to determine which prompts to use
    const existingImageCount = careerPath.all_images?.length || 0;
    console.log(`Existing images count: ${existingImageCount}`);

    // Generate 3 images per career path, rotating through available photos
    const scenePrompts = constructScenePrompts(careerPath, existingImageCount);
    console.log("Generating career images for:", careerPath.title);

    const allImageUrls: string[] = [];

    // Generate all 3 images, using different reference photos when available
    for (let i = 0; i < scenePrompts.length; i++) {
      const prompt = scenePrompts[i];
      // Rotate through available reference photos for variety
      const refPhotoIndex = i % allRefImagesBase64.length;
      const selectedRefPhoto = allRefImagesBase64[refPhotoIndex];
      console.log(`Generating image ${i + 1}/3 using reference photo ${refPhotoIndex + 1}...`);

      try {
        const imageBytes = await generateWithGemini(prompt, selectedRefPhoto);

        // Upload to storage bucket
        const fileName = `${user.id}/${pathId}-${i + 1}-${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from("career-images")
          .upload(fileName, imageBytes, {
            contentType: "image/png",
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          console.error(`Failed to upload image ${i + 1}:`, uploadError.message);
          continue; // Continue with other images even if one fails
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabaseClient.storage.from("career-images").getPublicUrl(fileName);

        allImageUrls.push(publicUrl);
        console.log(`Successfully generated image ${i + 1}/3`);
      } catch (imageError) {
        console.error(`Failed to generate image ${i + 1}/3:`, imageError);
        // Continue with other images even if one fails
      }

      // Small delay between generations to avoid rate limits
      if (i < scenePrompts.length - 1) {
        await sleep(1500);
      }
    }

    if (allImageUrls.length === 0) {
      throw new Error("Failed to generate any images");
    }

    // Store URLs in database - append to existing images or create new array
    const existingImages = careerPath.all_images || [];
    const combinedImages = [...existingImages, ...allImageUrls];

    const imageData = {
      image_url: existingImages.length === 0 ? allImageUrls[0] : careerPath.image_url,
      all_images: combinedImages,
    };

    const { error: updateError } = await supabaseClient.from("career_paths").update(imageData).eq("id", pathId);

    if (updateError) {
      console.error("Error updating career path with images:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: allImageUrls[0],
        allImages: allImageUrls,
        message: `Successfully generated ${allImageUrls.length} career images`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error generating path image:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
