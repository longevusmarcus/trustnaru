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

    // Read the action from request body
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
        method: "api",
      };

      // Attempt MSX publish - the base URL is per MSX docs
      const msxApiBase =
        Deno.env.get("MSX_API_BASE_URL") || "https://api.msx.gg";

      const publishRes = await fetch(`${msxApiBase}/v1/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const publishData = await publishRes.text();

      return new Response(
        JSON.stringify({
          status: publishRes.status,
          response: publishData,
          message:
            publishRes.ok
              ? "Successfully published to MSX"
              : "MSX publish returned non-OK status",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
