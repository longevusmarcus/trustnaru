import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MSX_API_BASE_URL = Deno.env.get("MSX_API_BASE_URL") ||
  "https://lsoxtrynzaxohvlqxpqe.supabase.co/functions/v1/msx-api";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    const launchToken = body?.launch_token;
    const appSlug = body?.app_slug || "naru";

    if (!launchToken) {
      return new Response(
        JSON.stringify({ error: "missing launch_token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Verify the launch token with the real MSX API
    console.log("[msx-session-bootstrap] Verifying launch token...");
    const verifyRes = await fetch(`${MSX_API_BASE_URL}/v1/launch/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: launchToken, appSlug }),
    });

    if (!verifyRes.ok) {
      const errText = await verifyRes.text();
      console.error("[msx-session-bootstrap] Verify failed:", verifyRes.status, errText);
      return new Response(
        JSON.stringify({ error: "launch_token_invalid", detail: errText }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const verifyData = await verifyRes.json();
    console.log("[msx-session-bootstrap] Verify response:", JSON.stringify(verifyData));

    const accessMode = verifyData.accessMode || "preview";
    const msxUser = verifyData.user; // { id, email? }

    if (accessMode !== "full") {
      return new Response(
        JSON.stringify({ error: "access_not_full", accessMode }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!msxUser?.id) {
      return new Response(
        JSON.stringify({ error: "no_user_identity_in_token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Find or create a local Supabase user mapped to this MSX identity
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Derive a stable email from the MSX user identity
    const msxEmail = msxUser.email || `msx_${msxUser.id}@msx.bridge.local`;
    // Stable password derived from MSX user ID (not user-facing, only for service-role sign-in)
    const msxPassword = `msx_bridge_${msxUser.id}_${appSlug}`;

    // Try to find existing user by email
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) =>
        u.email === msxEmail ||
        u.user_metadata?.msx_user_id === msxUser.id
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log("[msx-session-bootstrap] Found existing user:", userId);

      // Ensure MSX metadata is linked
      if (!existingUser.user_metadata?.msx_user_id) {
        await adminClient.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...existingUser.user_metadata,
            msx_user_id: msxUser.id,
            msx_linked_at: new Date().toISOString(),
          },
        });
      }
    } else {
      // Create new user
      console.log("[msx-session-bootstrap] Creating new user for MSX identity:", msxUser.id);
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email: msxEmail,
        password: msxPassword,
        email_confirm: true, // auto-confirm MSX users
        user_metadata: {
          msx_user_id: msxUser.id,
          msx_linked_at: new Date().toISOString(),
          display_name: msxUser.email?.split("@")[0] || `MSX User`,
        },
      });

      if (createErr) {
        console.error("[msx-session-bootstrap] User creation failed:", createErr);
        return new Response(
          JSON.stringify({ error: "user_creation_failed", detail: createErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user!.id;
    }

    // 3. Generate a session token the client can use to sign in
    //    We use admin.generateLink which gives us a magic link,
    //    but for direct session bootstrap we'll create a custom token approach.
    //    The simplest: update user password to a known value and return credentials,
    //    OR use signInWithPassword on the service role side.
    //    Best approach: use admin.generateLink for a magic link token.

    // Update password to the deterministic MSX bridge password
    await adminClient.auth.admin.updateUserById(userId, {
      password: msxPassword,
    });

    // Now sign in as the user to get a real session
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: signInData, error: signInErr } = await userClient.auth.signInWithPassword({
      email: msxEmail,
      password: msxPassword,
    });

    if (signInErr || !signInData.session) {
      console.error("[msx-session-bootstrap] Sign-in failed:", signInErr);
      return new Response(
        JSON.stringify({ error: "session_creation_failed", detail: signInErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[msx-session-bootstrap] Session created for user:", userId);

    return new Response(
      JSON.stringify({
        success: true,
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_in: signInData.session.expires_in,
        user_id: userId,
        msx_user_id: msxUser.id,
        accessMode,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[msx-session-bootstrap] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "internal_error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
