/**
 * MSX Shell Bridge
 * Handles launch-token verification and shell auth bridge for MSX integration.
 * This runs client-side to communicate with the MSX shell when embedded.
 */

interface MsxLaunchContext {
  launch_token?: string;
  user?: { id: string; email?: string };
  entitlements?: string[];
}

interface MsxShellMessage {
  type: string;
  payload?: unknown;
}

const MSX_VERIFY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/msx-verify`;

let msxContext: MsxLaunchContext | null = null;

/**
 * Check if we're running inside an MSX shell (iframe or window)
 */
export function isInsideMsx(): boolean {
  try {
    // Check URL params for MSX launch token
    const params = new URLSearchParams(window.location.search);
    if (params.has("msx_launch_token")) return true;
    // Check if inside iframe
    if (window.self !== window.top) return true;
    return false;
  } catch {
    return true; // cross-origin iframe throws, so we're embedded
  }
}

/**
 * Extract and verify MSX launch token
 */
export async function verifyMsxLaunch(): Promise<MsxLaunchContext | null> {
  const params = new URLSearchParams(window.location.search);
  const launchToken = params.get("msx_launch_token");

  if (!launchToken) return null;

  try {
    const res = await fetch(MSX_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ launch_token: launchToken }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.verified) {
        msxContext = {
          launch_token: launchToken,
          user: data.user,
          entitlements: data.entitlements,
        };
        notifyShell({ type: "app_ready", payload: { appId: "naru" } });
        return msxContext;
      }
    }
  } catch (e) {
    console.warn("[MSX] Launch verification failed:", e);
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
 * Check if user has MSX subscriber entitlement (skip paywall)
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
      window.parent.postMessage(
        { source: "naru", ...message },
        "*"
      );
    }
  } catch {
    // silently fail if not in iframe
  }
}

/**
 * Request auth via MSX shell bridge instead of in-app OAuth
 * This opens the auth flow in the parent MSX shell window
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
        break;
    }
  });
}
