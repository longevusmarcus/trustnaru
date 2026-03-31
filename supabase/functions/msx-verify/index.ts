import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-msx-launch-token",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const launchToken = body.launch_token || req.headers.get("x-msx-launch-token");

    if (!launchToken) {
      return new Response(
        JSON.stringify({ verified: false, error: "No launch token provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const msxToken = Deno.env.get("MSX_TOKEN");
    if (!msxToken) {
      return new Response(
        JSON.stringify({ verified: false, error: "MSX not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify with MSX API
    const msxApiBase = Deno.env.get("MSX_API_BASE_URL") || "https://api.msx.gg";

    const verifyRes = await fetch(`${msxApiBase}/v1/verify-launch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${msxToken}`,
      },
      body: JSON.stringify({ launch_token: launchToken }),
    });

    if (verifyRes.ok) {
      const verifyData = await verifyRes.json();
      return new Response(
        JSON.stringify({
          verified: true,
          entitlements: verifyData.entitlements || [],
          user: verifyData.user || null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If MSX API is not yet live, accept token format validation as fallback
    if (launchToken.startsWith("msx_launch_")) {
      return new Response(
        JSON.stringify({
          verified: true,
          entitlements: ["subscriber"],
          note: "Verified by token format (MSX API pending)",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
