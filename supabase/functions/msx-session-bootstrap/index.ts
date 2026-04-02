import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MSX_API_BASE_URL = Deno.env.get("MSX_API_BASE_URL") ||
  "https://lsoxtrynzaxohvlqxpqe.supabase.co/functions/v1/msx-api";

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (
  stage: string,
  reason: string,
  status: number,
  detail?: unknown,
) => {
  console.error(`[msx-session-bootstrap] ${stage}:`, reason, detail ? JSON.stringify(detail) : "");
  return jsonResponse(status, {
    success: false,
    stage,
    reason,
    detail: detail ?? null,
  });
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    const launchToken = body?.launch_token;
    const appSlug = body?.app_slug || "naru";

    if (!launchToken) {
      return fail("bootstrap function failed", "missing launch_token", 400);
    }

    console.log("[msx-session-bootstrap] Verifying launch token...");
    const verifyRes = await fetch(`${MSX_API_BASE_URL}/v1/launch/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: launchToken, appSlug }),
    });

    const verifyText = await verifyRes.text();
    let verifyData: Record<string, unknown> | null = null;

    try {
      verifyData = verifyText ? JSON.parse(verifyText) : {};
    } catch {
      verifyData = { raw: verifyText };
    }

    console.log("[msx-session-bootstrap] Verify status:", verifyRes.status);
    console.log("[msx-session-bootstrap] Verify response:", JSON.stringify(verifyData));

    if (!verifyRes.ok) {
      return fail("bootstrap function failed", "launch verify failed", 401, {
        status: verifyRes.status,
        body: verifyData,
      });
    }

    const accessMode = typeof verifyData?.accessMode === "string" ? verifyData.accessMode : "preview";
    const verifyUser = typeof verifyData?.user === "object" && verifyData.user !== null
      ? verifyData.user as Record<string, unknown>
      : null;
    const msxIdentityId = typeof verifyUser?.id === "string"
      ? verifyUser.id
      : typeof verifyData?.viewerId === "string"
        ? verifyData.viewerId
        : null;
    const msxEmail = typeof verifyUser?.email === "string"
      ? verifyUser.email
      : msxIdentityId
        ? `msx_${msxIdentityId}@msx.bridge.local`
        : null;

    if (accessMode !== "full") {
      return fail("bootstrap function failed", `access mode is not full (${accessMode})`, 403, verifyData);
    }

    if (!msxIdentityId || !msxEmail) {
      return fail("bootstrap function failed", "missing MSX identity in verify response", 401, verifyData);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return fail("bootstrap function failed", "missing local auth configuration", 500);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const msxPassword = `msx_bridge_${msxIdentityId}_${appSlug}`;

    const { data: existingUsers, error: listUsersError } = await adminClient.auth.admin.listUsers();
    if (listUsersError) {
      return fail("bootstrap function failed", "failed to list local users", 500, {
        message: listUsersError.message,
      });
    }

    const existingUser = existingUsers?.users?.find(
      (u) => u.email === msxEmail || u.user_metadata?.msx_user_id === msxIdentityId,
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log("[msx-session-bootstrap] Found existing user:", userId);

      if (!existingUser.user_metadata?.msx_user_id) {
        const { error: updateMetaError } = await adminClient.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...existingUser.user_metadata,
            msx_user_id: msxIdentityId,
            msx_linked_at: new Date().toISOString(),
          },
        });

        if (updateMetaError) {
          return fail("bootstrap function failed", "failed to link MSX metadata to local user", 500, {
            message: updateMetaError.message,
            userId,
          });
        }
      }
    } else {
      console.log("[msx-session-bootstrap] Creating new user for MSX identity:", msxIdentityId);
      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email: msxEmail,
        password: msxPassword,
        email_confirm: true,
        user_metadata: {
          msx_user_id: msxIdentityId,
          msx_linked_at: new Date().toISOString(),
          display_name: typeof verifyUser?.email === "string"
            ? verifyUser.email.split("@")[0]
            : "MSX User",
        },
      });

      if (createErr || !newUser.user) {
        return fail("bootstrap function failed", "user creation failed", 500, {
          message: createErr?.message ?? null,
        });
      }

      userId = newUser.user.id;
    }

    const { error: passwordUpdateError } = await adminClient.auth.admin.updateUserById(userId, {
      password: msxPassword,
    });

    if (passwordUpdateError) {
      return fail("bootstrap function failed", "failed to prepare deterministic local sign-in", 500, {
        message: passwordUpdateError.message,
        userId,
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: signInData, error: signInErr } = await userClient.auth.signInWithPassword({
      email: msxEmail,
      password: msxPassword,
    });

    if (signInErr || !signInData.session?.access_token || !signInData.session?.refresh_token) {
      return fail("bootstrap function failed", "failed to create local session", 500, {
        message: signInErr?.message ?? null,
      });
    }

    const tokenClaims = decodeJwtPayload(signInData.session.access_token);
    console.log("[msx-session-bootstrap] Returned token claims:", JSON.stringify({
      iss: tokenClaims?.iss ?? null,
      aud: tokenClaims?.aud ?? null,
      sub: tokenClaims?.sub ?? null,
    }));

    const expectedIssuer = `${supabaseUrl}/auth/v1`;
    const actualIssuer = typeof tokenClaims?.iss === "string" ? tokenClaims.iss : null;

    if (actualIssuer && actualIssuer !== expectedIssuer) {
      return fail("invalid local auth tokens", "token issuer does not match local Naru auth project", 500, {
        expectedIssuer,
        actualIssuer,
      });
    }

    const validateRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${signInData.session.access_token}`,
      },
    });

    const validateText = await validateRes.text();
    let validateBody: Record<string, unknown> | null = null;

    try {
      validateBody = validateText ? JSON.parse(validateText) : {};
    } catch {
      validateBody = { raw: validateText };
    }

    console.log("[msx-session-bootstrap] Local token validation status:", validateRes.status);
    console.log("[msx-session-bootstrap] Local token validation body:", JSON.stringify(validateBody));

    if (!validateRes.ok) {
      return fail("invalid local auth tokens", "local auth project rejected returned access token", 500, {
        status: validateRes.status,
        body: validateBody,
      });
    }

    if (validateBody?.id !== userId) {
      return fail("invalid local auth tokens", "validated access token resolved to unexpected local user", 500, {
        expectedUserId: userId,
        actualUserId: validateBody?.id ?? null,
      });
    }

    console.log("[msx-session-bootstrap] Session created for user:", userId);

    return jsonResponse(200, {
      success: true,
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      expires_in: signInData.session.expires_in,
      user_id: userId,
      msx_user_id: msxIdentityId,
      accessMode,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[msx-session-bootstrap] Unexpected error:", detail);
    return fail("bootstrap function failed", "unexpected bootstrap error", 500, { detail });
  }
});