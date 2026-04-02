/**
 * MSX Shell Bridge
 * Handles launch-token verification and shell auth bridge for MSX integration.
 */

interface MsxLaunchContext {
  launch_token?: string;
  user?: { id: string; email?: string };
  entitlements?: string[];
  accessMode?: string; // "full" | "trial" | "preview"
}

interface MsxShellMessage {
  type: string;
  payload?: unknown;
}

export interface MsxBootstrapResult {
  success: boolean;
  stage?: string;
  reason?: string;
  status?: number;
}

const MSX_LAUNCH_VERIFY_URL =
  "https://lsoxtrynzaxohvlqxpqe.supabase.co/functions/v1/msx-api/v1/launch/verify";

let msxContext: MsxLaunchContext | null = null;
let msxSessionBootstrapped = false;

/**
 * Check if a real MSX launch token exists (URL or persisted in sessionStorage).
 * This is the ONLY reliable signal for MSX auth context.
 */
export function hasMsxLaunchToken(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("msx_launch_token")) return true;
    if (sessionStorage.getItem("msx_launch_token")) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if we are running inside an iframe (embedded context).
 * Excludes known development/preview environments.
 * This does NOT imply we have a valid MSX auth token.
 */
export function isEmbedded(): boolean {
  try {
    if (window.self === window.top) return false;
    const host = window.location.hostname;
    if (host.includes("lovableproject.com") || host.includes("lovable.app")) return false;
    return true;
  } catch {
    return true;
  }
}

/**
 * Legacy helper — true when we have an MSX token OR are embedded.
 * Use hasMsxLaunchToken() for auth-gating decisions instead.
 */
export function isInsideMsx(): boolean {
  return hasMsxLaunchToken() || isEmbedded();
}

/**
 * Persist MSX launch params from URL into sessionStorage so they survive SPA navigation.
 * Call this as early as possible before any route changes.
 */
export function persistMsxLaunchParams(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("msx_launch_token");
    const slug = params.get("msx_app_slug");
    if (token) {
      sessionStorage.setItem("msx_launch_token", token);
      if (slug) sessionStorage.setItem("msx_app_slug", slug);
    }
  } catch {
    // sessionStorage may be unavailable
  }
}

/**
 * Get MSX launch token from URL params or sessionStorage
 */
export function getMsxLaunchToken(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("msx_launch_token") || sessionStorage.getItem("msx_launch_token") || null;
}

/**
 * Get MSX app slug from URL params or sessionStorage
 */
export function getMsxAppSlug(): string {
  const params = new URLSearchParams(window.location.search);
  return params.get("msx_app_slug") || sessionStorage.getItem("msx_app_slug") || "naru";
}

/**
 * Extract and verify MSX launch token against the real MSX API
 */
export async function verifyMsxLaunch(): Promise<MsxLaunchContext | null> {
  const launchToken = getMsxLaunchToken();
  const appSlug = getMsxAppSlug();

  if (!launchToken) return null;

  try {
    const res = await fetch(MSX_LAUNCH_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: launchToken, appSlug }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log("[MSX] Launch verify response:", data);

      if (data.verified || data.accessMode) {
        msxContext = {
          launch_token: launchToken,
          user: data.user,
          entitlements: data.entitlements || [],
          accessMode: data.accessMode || "full",
        };

        if (msxContext.accessMode === "full") {
          msxContext.entitlements = [...(msxContext.entitlements || []), "subscriber"];
        }

        notifyShell({ type: "app_ready", payload: { appId: "naru" } });
        return msxContext;
      }
    } else {
      const errText = await res.text();
      console.warn("[MSX] Launch verification failed:", res.status, errText);
    }
  } catch (e) {
    console.warn("[MSX] Launch verification error:", e);
  }

  return null;
}

/**
 * Get current MSX context (if verified)
 */
export function getMsxContext(): MsxLaunchContext | null {
  return msxContext;
}

/**
 * Check if user has full MSX access (bypass paywall)
 */
export function hasMsxFullAccess(): boolean {
  if (!msxContext) return false;
  return (
    msxContext.accessMode === "full" ||
    (msxContext.entitlements?.includes("subscriber") ?? false)
  );
}

/**
 * Check if user has MSX subscriber entitlement (legacy helper)
 */
export function hasMsxEntitlement(entitlement = "subscriber"): boolean {
  return msxContext?.entitlements?.includes(entitlement) ?? false;
}

/**
 * Send message to MSX shell (parent window)
 */
function notifyShell(message: MsxShellMessage) {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ source: "naru", ...message }, "*");
    }
  } catch {
    // silently fail if not in iframe
  }
}

/**
 * Check if MSX session bootstrap has completed
 */
export function isMsxSessionBootstrapped(): boolean {
  return msxSessionBootstrapped;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/**
 * Bootstrap a local Supabase session from MSX launch token.
 * Called automatically on app boot when inside MSX.
 */
export async function bootstrapMsxSession(): Promise<MsxBootstrapResult> {
  const launchToken = getMsxLaunchToken();
  const appSlug = getMsxAppSlug();

  if (!launchToken) {
    console.log("[MSX] No launch token for session bootstrap");
    return {
      success: false,
      stage: "bootstrap function failed",
      reason: "bootstrap function failed: missing launch token",
    };
  }

  try {
    const { supabase } = await import("@/integrations/supabase/client");

    const {
      data: { session: existingSession },
    } = await supabase.auth.getSession();

    if (existingSession) {
      console.log("[MSX] Existing session found, skipping bootstrap");
      msxSessionBootstrapped = true;
      return { success: true };
    }

    console.log("[MSX] Bootstrapping session via msx-session-bootstrap...");

    const bootstrapUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/msx-session-bootstrap`;
    const response = await fetch(bootstrapUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ launch_token: launchToken, app_slug: appSlug }),
    });

    const rawBody = await response.text();
    let body: Record<string, unknown> | null = null;

    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      body = { raw: rawBody };
    }

    console.log("[MSX] Session bootstrap response status:", response.status);
    console.log("[MSX] Session bootstrap response body:", body);

    if (!response.ok || body?.success === false) {
      const stage = typeof body?.stage === "string" ? body.stage : "bootstrap function failed";
      const reason = typeof body?.reason === "string"
        ? body.reason
        : typeof body?.error === "string"
          ? body.error
          : typeof body?.detail === "string"
            ? body.detail
            : `HTTP ${response.status}`;

      console.error("[MSX] Session bootstrap failed:", reason);
      return {
        success: false,
        stage,
        reason: `${stage}: ${reason}`,
        status: response.status,
      };
    }

    const accessToken = typeof body?.access_token === "string" ? body.access_token : null;
    const refreshToken = typeof body?.refresh_token === "string" ? body.refresh_token : null;

    if (!accessToken || !refreshToken) {
      const reason = "missing access_token or refresh_token in bootstrap response";
      console.error("[MSX] Session bootstrap failed:", reason);
      return {
        success: false,
        stage: "invalid local auth tokens",
        reason: `invalid local auth tokens: ${reason}`,
        status: response.status,
      };
    }

    const tokenClaims = decodeJwtPayload(accessToken);
    console.log("[MSX] Bootstrap token claims:", {
      iss: tokenClaims?.["iss"] ?? null,
      aud: tokenClaims?.["aud"] ?? null,
      sub: tokenClaims?.["sub"] ?? null,
    });

    const { error: setErr } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    console.log("[MSX] supabase.auth.setSession result:", setErr ? { success: false, error: setErr.message } : { success: true });

    if (setErr) {
      return {
        success: false,
        stage: "setSession failed",
        reason: `setSession failed: ${setErr.message}`,
      };
    }

    const sessionResult = await supabase.auth.getSession();
    console.log("[MSX] supabase.auth.getSession result:", {
      hasSession: Boolean(sessionResult.data.session),
      userId: sessionResult.data.session?.user?.id ?? null,
      error: sessionResult.error?.message ?? null,
    });

    if (!sessionResult.data.session) {
      console.error("[MSX] Session hydration check failed after setSession");
      return {
        success: false,
        stage: "getSession remained empty",
        reason: "getSession remained empty: supabase.auth.getSession() returned no local session",
      };
    }

    console.log("[MSX] Session bootstrapped successfully for user:", body?.user_id);
    msxSessionBootstrapped = true;
    return { success: true };
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    console.warn("[MSX] Session bootstrap error:", reason);
    return {
      success: false,
      stage: "bootstrap function failed",
      reason: `bootstrap function failed: ${reason}`,
    };
  }
}

/**
 * Request auth via MSX shell bridge instead of in-app OAuth
 */
export function requestShellAuth(provider: string = "google") {
  notifyShell({
    type: "auth_request",
    payload: { provider, appId: "naru" },
  });
}

/**
 * Listen for messages from MSX shell
 */
export function initMsxListener(
  onAuthComplete?: (user: { id: string; email?: string }) => void,
) {
  window.addEventListener("message", (event) => {
    if (!event.data || event.data.source !== "msx_shell") return;

    switch (event.data.type) {
      case "auth_complete":
        if (onAuthComplete && event.data.payload?.user) {
          onAuthComplete(event.data.payload.user);
        }
        break;
      case "entitlement_update":
        if (msxContext && event.data.payload?.entitlements) {
          msxContext.entitlements = event.data.payload.entitlements;
        }
        if (msxContext && event.data.payload?.accessMode) {
          msxContext.accessMode = event.data.payload.accessMode;
        }
        break;
    }
  });
}
