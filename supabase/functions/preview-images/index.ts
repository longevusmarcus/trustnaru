const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);

    // If body is null or urls is not an array, return empty success
    if (!body || !Array.isArray(body?.urls)) {
      return new Response(JSON.stringify({ images: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const validUrls: string[] = [];
    for (const u of body.urls) {
      if (typeof u !== "string") continue;
      try {
        new URL(u);
        validUrls.push(u);
      } catch {
        // skip invalid URLs
      }
    }

    // Zero valid URLs → still success with empty map
    if (validUrls.length === 0) {
      return new Response(JSON.stringify({ images: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Build a map of url → og:image (best-effort, fail-soft per URL)
    const images: Record<string, string | null> = {};

    await Promise.all(
      validUrls.map(async (url) => {
        try {
          const resp = await fetch(url, {
            headers: { "User-Agent": "NaruBot/1.0" },
            redirect: "follow",
          });
          if (!resp.ok) {
            images[url] = null;
            return;
          }
          const html = await resp.text();
          const match = html.match(
            /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
          ) || html.match(
            /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
          );
          images[url] = match?.[1] ?? null;
        } catch {
          images[url] = null;
        }
      })
    );

    return new Response(JSON.stringify({ images }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("preview-images error:", err);
    return new Response(JSON.stringify({ images: {} }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
