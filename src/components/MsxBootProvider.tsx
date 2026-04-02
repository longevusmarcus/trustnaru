import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  bootstrapMsxSession,
  getMsxLaunchToken,
  hasMsxLaunchToken,
  initMsxListener,
  isEmbedded,
  persistMsxLaunchParams,
  verifyMsxLaunch,
} from "@/lib/msxBridge";

export type MsxBootStatus = "idle" | "booting" | "ready" | "failed";

interface MsxBootContextValue {
  /** True when a real MSX launch token was found (URL or sessionStorage). */
  hasMsxLaunchContext: boolean;
  /** True when the app is embedded in an iframe but has NO launch token. */
  isEmbeddedWithoutToken: boolean;
  status: MsxBootStatus;
}

const MsxBootContext = createContext<MsxBootContextValue | undefined>(undefined);

export const MsxOpeningScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
    <p className="text-sm text-muted-foreground">Opening in MSX…</p>
  </div>
);

export const MsxLaunchErrorScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
    <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
      <span className="text-destructive text-xl">!</span>
    </div>
    <h1 className="text-lg font-medium text-foreground">Missing MSX Launch Token</h1>
    <p className="text-sm text-muted-foreground max-w-sm">
      This app was opened without a valid MSX launch token. Please reopen it from MSX to sign in automatically.
    </p>
  </div>
);

export const MsxBootProvider = ({ children }: { children: ReactNode }) => {
  const [hasMsxCtx] = useState<boolean>(() => {
    persistMsxLaunchParams();
    const hasToken = hasMsxLaunchToken();
    console.log("[MSX] Launch token present:", hasToken, "| Token value:", getMsxLaunchToken()?.slice(0, 12) ?? "null");
    return hasToken;
  });

  const [embeddedNoToken] = useState<boolean>(() => {
    const embedded = isEmbedded();
    const hasToken = hasMsxLaunchToken();
    const result = embedded && !hasToken;
    if (result) {
      console.warn("[MSX] Embedded in iframe WITHOUT launch token — will show error state");
    }
    return result;
  });

  const [status, setStatus] = useState<MsxBootStatus>(hasMsxCtx ? "booting" : "idle");

  useEffect(() => {
    if (!hasMsxCtx) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    initMsxListener();

    const boot = async () => {
      setStatus("booting");
      console.log("[MSX] Boot gate starting…");

      try {
        console.log("[MSX] Verifying launch token…");
        const ctx = await verifyMsxLaunch();

        if (!ctx || ctx.accessMode !== "full") {
          console.warn("[MSX] Launch verify result:", ctx ? `accessMode=${ctx.accessMode}` : "null");
          throw new Error("MSX launch verification failed or access mode is not full");
        }
        console.log("[MSX] Launch verified — accessMode:", ctx.accessMode);

        console.log("[MSX] Bootstrapping session…");
        const bootstrapped = await bootstrapMsxSession();
        if (!bootstrapped) {
          throw new Error("MSX session bootstrap failed");
        }
        console.log("[MSX] Session bootstrap succeeded");

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("MSX session was not fully restored after setSession");
        }

        console.log("[MSX] Session confirmed — user:", session.user?.id?.slice(0, 8));

        if (!cancelled) {
          console.log("[MSX] Boot status → ready");
          setStatus("ready");
        }
      } catch (error) {
        console.error("[MSX] Boot gate FAILED:", error);
        if (!cancelled) {
          setStatus("failed");
        }
      }
    };

    void boot();

    return () => {
      cancelled = true;
    };
  }, [hasMsxCtx]);

  const value = useMemo(
    () => ({
      hasMsxLaunchContext: hasMsxCtx,
      isEmbeddedWithoutToken: embeddedNoToken,
      status,
    }),
    [hasMsxCtx, embeddedNoToken, status],
  );

  return <MsxBootContext.Provider value={value}>{children}</MsxBootContext.Provider>;
};

export const useMsxBoot = () => {
  const context = useContext(MsxBootContext);

  if (!context) {
    throw new Error("useMsxBoot must be used within an MsxBootProvider");
  }

  return context;
};
