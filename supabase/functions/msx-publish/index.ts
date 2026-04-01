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
    const msxApiBase = (Deno.env.get("MSX_API_BASE_URL") || "https://lsoxtrynzaxohvlqxpqe.supabase.co/functions/v1/msx-api").replace(/\/+$/, "");

    // Auth headers for all MSX API calls
    const msxHeaders = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${msxToken}`,
    };

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
        builderId: "fb8fcbe9-1d72-44c2-ac52-241916ed7453",
        method: "api",
      };

      const publishUrl = `${msxApiBase}/v1/publish`;

      console.log("[MSX] API base:", msxApiBase);
      console.log("[MSX] POST target:", publishUrl);
      console.log("[MSX] Auth header: Bearer <redacted>");

      // Step 1: Publish (authenticated)
      const publishRes = await fetch(publishUrl, {
        method: "POST",
        headers: msxHeaders,
        body: JSON.stringify(payload),
      });

      const publishBody = await publishRes.text();
      const isHtml = publishBody.trimStart().startsWith("<!") || publishBody.trimStart().startsWith("<html");

      console.log("[MSX] Publish HTTP status:", publishRes.status);
      if (!isHtml) {
        console.log("[MSX] Publish response:", publishBody.substring(0, 2000));
      }

      let publishJson: any = null;
      if (!isHtml) {
        try { publishJson = JSON.parse(publishBody); } catch { /* ignore */ }
      }

      // Step 2: Trigger verification/probe for the slug
      const probeUrl = `${msxApiBase}/v1/runtime/probe`;
      const probePayload = {
        slug: "naru",
        credential: msxToken,
        targetUrl: "https://trustnaru.com",
        source: "lovable-runtime-probe",
      };
      console.log("[MSX] Probe URL:", probeUrl);
      console.log("[MSX] Probe payload:", JSON.stringify({ ...probePayload, credential: "<redacted>" }));

      let verifyResult: any = null;
      try {
        const verifyRes = await fetch(probeUrl, {
          method: "POST",
          headers: msxHeaders,
          body: JSON.stringify(probePayload),
        });
        const verifyBody = await verifyRes.text();
        console.log("[MSX] Probe HTTP status:", verifyRes.status);
        console.log("[MSX] Probe response:", verifyBody.substring(0, 2000));
        try { verifyResult = JSON.parse(verifyBody); } catch { verifyResult = { raw: verifyBody.substring(0, 1000) }; }
      } catch (err) {
        verifyResult = { error: `Verify fetch failed: ${err.message}` };
      }

      // Step 3: Fetch catalog to confirm final state
      const catalogUrl = `${msxApiBase}/v1/apps?includePublished=1`;
      let naruRecord: any = null;
      let allSlugs: string[] = [];
      try {
        const catalogRes = await fetch(catalogUrl, { headers: msxHeaders });
        const catalogBody = await catalogRes.text();
        const catalogIsHtml = catalogBody.trimStart().startsWith("<!") || catalogBody.trimStart().startsWith("<html");
        if (!catalogIsHtml) {
          const catalogJson = JSON.parse(catalogBody);
          const apps = Array.isArray(catalogJson) ? catalogJson : catalogJson?.apps || catalogJson?.data || [];
          allSlugs = apps.map((a: any) => a.slug);
          naruRecord = apps.find((a: any) => a.slug === "naru");
        }
      } catch (err) {
        console.log("[MSX] Catalog fetch error:", err.message);
      }

      const publishFailed = isHtml || !publishRes.ok;

      return new Response(
        JSON.stringify({
          publishStatus: publishRes.status,
          publishFailed,
          publishResponse: publishJson,
          verifyResult,
          naruRecord: naruRecord || null,
          allSlugs,
          summary: {
            slug: naruRecord?.slug || "naru",
            builderId: naruRecord?.builderId || null,
            verificationStatus: naruRecord?.verificationStatus || "unknown",
            deploymentHealth: naruRecord?.deploymentHealth || "unknown",
            billingMode: naruRecord?.billingMode || "unknown",
            shellCapabilities: naruRecord?.shellCapabilities || [],
            arenaEligible: naruRecord?.verificationStatus === "verified" && naruRecord?.billingMode === "msx_managed" && (naruRecord?.shellCapabilities || []).includes("launch_token_verify"),
          },
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
