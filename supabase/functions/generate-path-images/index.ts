// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// small helper
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Convert ArrayBuffer to base64 safely */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/** Fetch URL -> { base64, mimeType } */
async function fetchUrlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch reference image: ${resp.status}`);
  const contentType = resp.headers.get("content-type") ?? "image/jpeg";
  const buffer = await resp.arrayBuffer();
  return { base64: arrayBufferToBase64(buffer), mimeType: contentType.split(";")[0] };
}

/** Normalize mime for Gemini */
function normalizeMimeType(mime: string) {
  return mime === "image/png" ? "image/png" : "image/jpeg";
}

/** Generate image using Gemini 2.5 preview endpoint */
async function generateWithGeminiImage(
  prompt: string,
  refImages: { data: string; mime_type: string }[],
  maxRetries = 2,
): Promise<Uint8Array> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("Missing GEMINI_API_KEY");

  const payload: any = { prompt, images: refImages };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Gemini 2.5 attempt ${attempt + 1}/${maxRetries + 1}`);

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateImage?key=${GEMINI_API_KEY}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      );

      if (!res.ok) {
        const text = await res.text();
        console.error("Gemini error:", res.status, text);
        if (res.status >= 500 && attempt < maxRetries) {
          await sleep(Math.pow(2, attempt) * 1000);
          continue;
        }
        throw new Error(`Gemini error ${res.status}: ${text}`);
      }

      const json = await res.json();
      const base64 = json?.images?.[0]?.data;
      if (!base64) throw new Error("No image data returned by Gemini");

      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    } catch (err) {
      console.error(`Gemini attempt ${attempt + 1} failed:`, err);
      if (attempt === maxRetries) throw err;
      await sleep(Math.pow(2, attempt) * 1000);
    }
  }

  throw new Error("All Gemini attempts failed");
}

/** Build prompts for career images */
const constructScenePrompts = (careerPath: any, existingImageCount = 0) => {
  const roleTitle = careerPath.title || "Professional";
  const keySkills = careerPath.key_skills?.slice(0, 2).join(", ") || "professional skills";
  const lifestyle = careerPath.lifestyle_benefits?.[0] || "successful professional lifestyle";

  const baseQualifiers =
    "High-resolution professional photograph, natural lighting, shallow depth of field, cinematic composition.";

  // keep original phrasing but drop consent note
  const identityNotice =
    "Preserve the subject's likeness and facial features from reference photos. Avoid unrealistic face alterations.";

  if ((existingImageCount ?? 0) === 0) {
    return [
      `Professional photograph of a ${roleTitle} actively working, demonstrating ${keySkills}. ${baseQualifiers} ${identityNotice}`,
      `Candid shot of a ${roleTitle} collaborating or presenting his work. ${baseQualifiers} ${identityNotice}`,
      `Lifestyle portrait of a ${roleTitle} enjoying ${lifestyle}, golden hour lighting, cinematic framing. ${baseQualifiers} ${identityNotice}`,
    ];
  }

  return [
    `Professional shot of a ${roleTitle} focused at work, demonstrating ${keySkills}. ${baseQualifiers} ${identityNotice}`,
    `Evening networking shot of a ${roleTitle} in social context, natural interactions. ${baseQualifiers} ${identityNotice}`,
    `Home office portrait of a ${roleTitle} in a personal workspace, authentic expression. ${baseQualifiers} ${identityNotice}`,
  ];
};

/** MAIN HANDLER */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });

    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const body = await req.json();
    const pathId = body?.pathId;
    if (!pathId) throw new Error("Missing pathId");

    const { data: careerPath, error: careerErr } = await supabase
      .from("career_paths")
      .select("*")
      .eq("id", pathId)
      .single();
    if (careerErr || !careerPath) throw new Error("Career path not found");

    const { data: photos } = await supabase
      .from("user_photos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!photos?.length) throw new Error("No reference photos");

    const chosen = photos.slice(0, 3);
    const refs: { data: string; mime_type: string }[] = [];

    for (const p of chosen) {
      try {
        let obj = p.photo_url.replace(/^user-photos\//, "").replace(/^\/+/, "");
        const { data: signed } = await supabase.storage.from("user-photos").createSignedUrl(obj, 3600);
        if (!signed?.signedUrl) continue;
        const { base64, mimeType } = await fetchUrlToBase64(signed.signedUrl);
        refs.push({ data: base64, mime_type: normalizeMimeType(mimeType) });
      } catch (e) {
        console.error("Failed to load reference image:", e);
      }
    }

    if (refs.length === 0) {
      const p = photos[0];
      let obj = p.photo_url.replace(/^user-photos\//, "").replace(/^\/+/, "");
      const { data: signed } = await supabase.storage.from("user-photos").createSignedUrl(obj, 3600);
      if (!signed?.signedUrl) throw new Error("Failed to access reference photo");
      const { base64, mimeType } = await fetchUrlToBase64(signed.signedUrl);
      refs.push({ data: base64, mime_type: normalizeMimeType(mimeType) });
    }

    const existingCount = careerPath.all_images?.length ?? 0;
    const prompts = constructScenePrompts(careerPath, existingCount);
    const urls: string[] = [];

    for (let i = 0; i < prompts.length; i++) {
      const prompt = `${prompts[i]}\n\nPhotographic style: realistic, natural expressions, minimal retouching.`;
      const selectedRef = [refs[i % refs.length]];

      try {
        const bytes = await generateWithGeminiImage(prompt, selectedRef);
        const name = `${user.id}/${pathId}-${i + 1}-${Date.now()}.png`;
        const { error: upErr } = await supabase.storage
          .from("career-images")
          .upload(name, bytes, { contentType: "image/png", upsert: false });
        if (upErr) continue;

        const { data: pub } = supabase.storage.from("career-images").getPublicUrl(name);
        if (pub?.publicUrl) urls.push(pub.publicUrl);
      } catch (e) {
        console.error("Generation failed:", e);
      }

      if (i < prompts.length - 1) await sleep(1200);
    }

    if (!urls.length) throw new Error("No images generated");

    const merged = [...(careerPath.all_images ?? []), ...urls];
    const mainImage = careerPath.image_url || urls[0];

    await supabase.from("career_paths").update({ image_url: mainImage, all_images: merged }).eq("id", pathId);

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl: mainImage,
        allImages: urls,
        message: `Generated ${urls.length} images`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Handler error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
