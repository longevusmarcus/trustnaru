import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is admin
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const msxToken = Deno.env.get("MSX_TOKEN");
    if (!msxToken) {
      return new Response(
        JSON.stringify({ error: "MSX_TOKEN not configured" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "publish";

    if (action === "publish") {
      const payload = {
        name: "Naru",
        slug: "naru",
        summary:
          "The OS for Becoming — AI-powered career guidance that turns your potential into a clear path forward.",
        desire:
          "I want AI to guide my career growth with personalized paths, mentors, and daily actions.",
        source: "https://trustnaru.com",
        credential: msxToken,
        access: "subscriber",
        billingMode: "msx_managed",
        shellCapabilities: ["launch_token_verify", "shell_auth_bridge"],
        method: "api",
      };

      const msxApiBase = (Deno.env.get("MSX_API_BASE_URL") || "https://lsoxtrynzaxohvlqxpqe.supabase.co/functions/v1/msx-api").replace(/\/+$/, "");
      const publishUrl = `${msxApiBase}/v1/publish`;

      console.log("[MSX] MSX_API_BASE_URL env:", Deno.env.get("MSX_API_BASE_URL") || "(not set, using https://msx.gg)");
      console.log("[MSX] POST target:", publishUrl);
      console.log("[MSX] Payload:", JSON.stringify(payload));

      // Step 1: Publish
      const publishRes = await fetch(publishUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const publishBody = await publishRes.text();
      const isHtml = publishBody.trimStart().startsWith("<!") || publishBody.trimStart().startsWith("<html");

      console.log("[MSX] Publish HTTP status:", publishRes.status);
      console.log("[MSX] Publish response content-type:", publishRes.headers.get("content-type"));
      console.log("[MSX] Publish response is HTML:", isHtml);
      if (!isHtml) {
        console.log("[MSX] Publish response body:", publishBody.substring(0, 2000));
      } else {
        console.log("[MSX] Publish response was HTML (not a JSON API response) — endpoint likely does not exist");
      }

      // Step 2: Verify catalog
      const catalogUrl = `${msxApiBase}/v1/apps?includePublished=1`;
      console.log("[MSX] Catalog verify URL:", catalogUrl);

      let catalogResult: any = null;
      let appFoundInCatalog = false;
      try {
        const catalogRes = await fetch(catalogUrl);
        const catalogBody = await catalogRes.text();
        const catalogIsHtml = catalogBody.trimStart().startsWith("<!") || catalogBody.trimStart().startsWith("<html");

        console.log("[MSX] Catalog HTTP status:", catalogRes.status);
        console.log("[MSX] Catalog response is HTML:", catalogIsHtml);

        if (!catalogIsHtml) {
          try {
            catalogResult = JSON.parse(catalogBody);
            // Search for our app slug
            if (Array.isArray(catalogResult)) {
              appFoundInCatalog = catalogResult.some((app: any) => app.slug === "naru" || app.name === "Naru");
            } else if (catalogResult?.apps && Array.isArray(catalogResult.apps)) {
              appFoundInCatalog = catalogResult.apps.some((app: any) => app.slug === "naru" || app.name === "Naru");
            } else if (catalogResult?.data && Array.isArray(catalogResult.data)) {
              appFoundInCatalog = catalogResult.data.some((app: any) => app.slug === "naru" || app.name === "Naru");
            }
          } catch {
            catalogResult = { raw: catalogBody.substring(0, 2000) };
          }
        } else {
          catalogResult = { error: "Catalog endpoint returned HTML, not JSON API" };
        }
      } catch (err) {
        catalogResult = { error: `Catalog fetch failed: ${err.message}` };
      }

      console.log("[MSX] App found in catalog:", appFoundInCatalog);

      const publishFailed = isHtml || !publishRes.ok;

      return new Response(
        JSON.stringify({
          publishStatus: publishRes.status,
          publishEndpoint: publishUrl,
          publishResponseIsHtml: isHtml,
          publishFailed,
          payload,
          catalogVerifyUrl: catalogUrl,
          appFoundInCatalog,
          catalogResult: catalogResult,
          verdict: publishFailed
            ? "PUBLISH FAILED — the publish endpoint returned HTML or a non-OK status. The MSX API base URL may be wrong."
            : appFoundInCatalog
              ? "SUCCESS — app 'naru' is live in the MSX catalog."
              : "PUBLISH returned OK but app NOT found in catalog. May need a different API base URL or the catalog endpoint differs.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: corsHeaders }
    );
  } catch (error) {
    console.error("[MSX] Unhandled error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
