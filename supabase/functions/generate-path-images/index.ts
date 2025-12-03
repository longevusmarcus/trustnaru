// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function fetchUrlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch reference image: ${resp.status}`);
  const contentType = resp.headers.get("content-type") ?? "image/jpeg";
  const buffer = await resp.arrayBuffer();
  return { base64: arrayBufferToBase64(buffer), mimeType: contentType.split(";")[0] };
}

async function generateWithGemini(
  prompt: string,
  refImage: { data: string; mime_type: string } | null,
  maxRetries = 2,
): Promise<Uint8Array> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Gemini API attempt ${attempt + 1}/${maxRetries + 1}`);

      const parts: any[] = [{ text: prompt }];
      
      if (refImage) {
        parts.push({
          inlineData: {
            mimeType: refImage.mime_type,
            data: refImage.data
          }
        });
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ["image", "text"],
            responseMimeType: "image/png"
          }
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("Gemini API error:", response.status, text);
        if (response.status >= 500 && attempt < maxRetries) {
          await sleep(Math.pow(2, attempt) * 1000);
          continue;
        }
        throw new Error(`Gemini API error ${response.status}: ${text}`);
      }

      const data = await response.json();
      console.log("Gemini API response received");

      // Extract image from response
      const candidates = data.candidates;
      if (!candidates || candidates.length === 0) {
        throw new Error("No candidates in Gemini response");
      }

      const content = candidates[0].content;
      if (!content || !content.parts) {
        throw new Error("No content parts in Gemini response");
      }

      // Find the image part
      const imagePart = content.parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
      if (!imagePart) {
        console.error("No image in Gemini response:", JSON.stringify(data).slice(0, 500));
        throw new Error("No image returned by Gemini");
      }

      const base64Data = imagePart.inlineData.data;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

      return bytes;
    } catch (err) {
      console.error(`Attempt ${attempt + 1} failed:`, err);
      if (attempt === maxRetries) throw err;
      console.log(`Waiting ${Math.pow(2, attempt) * 1000}ms before retry...`);
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }

  throw new Error("All Gemini API attempts failed");
}

const constructScenePrompts = (careerPath: any, existingImageCount = 0) => {
  const roleTitle = careerPath.title || "Professional";
  const keySkills = careerPath.key_skills?.slice(0, 2).join(", ") || "professional skills";
  const lifestyle = careerPath.lifestyle_benefits?.[0] || "successful professional lifestyle";
  const baseQualifiers = "High-resolution professional photograph, natural lighting, realistic settings.";
  const identityNotice =
    "Preserve the subject's likeness and facial features from reference photos. Use EXACT person from reference photo - identical facial features, skin texture, hair, body type, proportions. NO modifications to face or body. Photojournalistic style capturing authentic moment. Avoid unrealistic face alterations.";

  if ((existingImageCount ?? 0) === 0) {
    return [
      `Professional photograph of a ${roleTitle} actively working, demonstrating ${keySkills}. ${baseQualifiers} ${identityNotice}`,
      `Candid shot of a ${roleTitle} collaborating or presenting ideas in a modern office. ${baseQualifiers} ${identityNotice}`,
      `Lifestyle portrait of a ${roleTitle} enjoying ${lifestyle}, golden hour lighting, modern framing. ${baseQualifiers} ${identityNotice}`,
    ];
  }

  return [
    `Professional shot of a ${roleTitle} focused at work, demonstrating ${keySkills}. ${baseQualifiers} ${identityNotice}`,
    `Evening networking shot of a ${roleTitle} in social context, natural interactions. ${baseQualifiers} ${identityNotice}`,
    `Home office portrait of a ${roleTitle} in a personal workspace, authentic expression. ${baseQualifiers} ${identityNotice}`,
  ];
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: authData } = await supabaseClient.auth.getUser();
    const user = authData?.user;
    if (!user)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const body = await req.json();
    const pathId = body?.pathId;
    if (!pathId) throw new Error("Missing pathId");

    console.log(`Generating images for path: ${pathId}`);

    const { data: careerPath } = await supabaseClient.from("career_paths").select("*").eq("id", pathId).single();
    if (!careerPath) throw new Error("Career path not found");

    const { data: userPhotos } = await supabaseClient
      .from("user_photos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const refImages: { data: string; mime_type: string }[] = [];

    if (userPhotos && userPhotos.length > 0) {
      for (const photo of userPhotos.slice(0, 3)) {
        try {
          const objectPath = (photo.photo_url as string).replace(/^user-photos\/?/, "");
          const { data: signed } = await supabaseClient.storage.from("user-photos").createSignedUrl(objectPath, 3600);
          if (!signed?.signedUrl) continue;
          const { base64, mimeType } = await fetchUrlToBase64(signed.signedUrl);
          refImages.push({ data: base64, mime_type: mimeType });
        } catch (err) {
          console.error("Error fetching reference photo:", err);
        }
      }
    }

    console.log(`Found ${refImages.length} reference images`);

    const existingImageCount = careerPath.all_images?.length || 0;
    const scenePrompts = constructScenePrompts(careerPath, existingImageCount);

    const allImageUrls: string[] = [];
    for (let i = 0; i < scenePrompts.length; i++) {
      const prompt = `${scenePrompts[i]}\n\nPhotographic style: realistic, natural expressions. Ultra high resolution.`;
      const selectedRef = refImages.length > 0 ? refImages[i % refImages.length] : null;

      console.log(`Generating image ${i + 1}/${scenePrompts.length}...`);

      try {
        const imageBytes = await generateWithGemini(prompt, selectedRef, 2);
        const fileName = `${user.id}/${pathId}-${i + 1}-${Date.now()}.png`;
        const { error: uploadError } = await supabaseClient.storage
          .from("career-images")
          .upload(fileName, imageBytes, { contentType: "image/png", upsert: false });

        if (uploadError) {
          console.error(`Upload error for image ${i + 1}:`, uploadError);
          continue;
        }

        const { data: publicData } = supabaseClient.storage.from("career-images").getPublicUrl(fileName);
        if (publicData?.publicUrl) {
          allImageUrls.push(publicData.publicUrl);
          console.log(`Successfully generated image ${i + 1}`);
        }
      } catch (err) {
        console.error(`Generation failed for image ${i + 1}:`, err);
      }

      if (i < scenePrompts.length - 1) await sleep(1500);
    }

    if (allImageUrls.length === 0) throw new Error("Failed to generate any images");

    const combinedImages = [...(careerPath.all_images || []), ...allImageUrls];
    await supabaseClient
      .from("career_paths")
      .update({ image_url: careerPath.image_url || allImageUrls[0], all_images: combinedImages })
      .eq("id", pathId);

    console.log(`Successfully generated ${allImageUrls.length} images`);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: allImageUrls[0],
        allImages: allImageUrls,
        message: `Generated ${allImageUrls.length} images`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error generating path image:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
