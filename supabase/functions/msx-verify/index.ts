import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-msx-launch-token",
};

const MSX_LAUNCH_VERIFY_URL =
  "https://lsoxtrynzaxohvlqxpqe.supabase.co/functions/v1/msx-api/v1/launch/verify";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const launchToken = body.launch_token || body.token || req.headers.get("x-msx-launch-token");
    const appSlug = body.appSlug || body.app_slug || "naru";

    if (!launchToken) {
      return new Response(
        JSON.stringify({ verified: false, error: "No launch token provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify with real MSX launch/verify endpoint
    const verifyRes = await fetch(MSX_LAUNCH_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: launchToken, appSlug }),
    });

    if (verifyRes.ok) {
      const verifyData = await verifyRes.json();
      return new Response(
        JSON.stringify({
          verified: true,
          accessMode: verifyData.accessMode || "full",
          entitlements: verifyData.entitlements || ["subscriber"],
          user: verifyData.user || null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const errText = await verifyRes.text();
    console.error("[msx-verify] MSX API returned:", verifyRes.status, errText);

    return new Response(
      JSON.stringify({ verified: false, error: "Invalid launch token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ verified: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
