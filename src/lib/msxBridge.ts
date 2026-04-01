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

const MSX_LAUNCH_VERIFY_URL =
  "https://lsoxtrynzaxohvlqxpqe.supabase.co/functions/v1/msx-api/v1/launch/verify";

let msxContext: MsxLaunchContext | null = null;

/**
 * Check if we're running inside an MSX shell (iframe or window)
 */
export function isInsideMsx(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("msx_launch_token")) return true;
    if (window.self !== window.top) return true;
    return false;
  } catch {
    return true;
  }
}

/**
 * Extract and verify MSX launch token against the real MSX API
 */
export async function verifyMsxLaunch(): Promise<MsxLaunchContext | null> {
  const params = new URLSearchParams(window.location.search);
  const launchToken = params.get("msx_launch_token");
  const appSlug = params.get("msx_app_slug") || "naru";

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

        // If accessMode is "full", mark as entitled
        if (msxContext.accessMode === "full") {
          msxContext.entitlements = [
            ...(msxContext.entitlements || []),
            "subscriber",
          ];
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
  onAuthComplete?: (user: { id: string; email?: string }) => void
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
