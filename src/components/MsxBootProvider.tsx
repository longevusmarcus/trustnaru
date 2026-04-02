import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  bootstrapMsxSession,
  hasMsxLaunchToken,
  initMsxListener,
  isEmbedded,
  persistMsxLaunchParams,
  verifyMsxLaunch,
} from "@/lib/msxBridge";

export type MsxBootStatus = "idle" | "booting" | "ready" | "failed";

interface MsxBootContextValue {
  hasMsxLaunchContext: boolean;
  isEmbeddedWithoutToken: boolean;
  status: MsxBootStatus;
  failureReason: string | null;
}

const defaultMsxBootContext: MsxBootContextValue = {
  hasMsxLaunchContext: false,
  isEmbeddedWithoutToken: false,
  status: "idle",
  failureReason: null,
};

const MsxBootContext = createContext<MsxBootContextValue>(defaultMsxBootContext);

export const MsxOpeningScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
    <p className="text-sm text-muted-foreground">Opening in MSX…</p>
  </div>
);

export const MsxLaunchErrorScreen = ({ reason }: { reason?: string }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background px-6 text-center">
    <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
      <span className="text-destructive text-xl">!</span>
    </div>
    <h1 className="text-lg font-medium text-foreground">
      {reason ? "MSX Sign-In Failed" : "Missing MSX Launch Token"}
    </h1>
    <p className="text-sm text-muted-foreground max-w-sm">
      {reason
        ? reason
        : "This app was opened without a valid MSX launch token. Please reopen it from MSX to sign in automatically."}
    </p>
    <p className="text-xs text-muted-foreground/60 max-w-xs">
      Try closing this tab and reopening the app from MSX.
    </p>
  </div>
);

export const MsxBootProvider = ({ children }: { children: ReactNode }) => {
  const [hasMsxCtx] = useState<boolean>(() => {
    try {
      persistMsxLaunchParams();
      const hasToken = hasMsxLaunchToken();
      console.log("[MSX] Launch token present:", hasToken);
      return hasToken;
    } catch (e) {
      console.warn("[MSX] Error during launch detection:", e);
      return false;
    }
  });

  const [embeddedNoToken] = useState<boolean>(() => {
    try {
      const embedded = isEmbedded();
      const hasToken = hasMsxLaunchToken();
      const result = embedded && !hasToken;
      if (result) {
        console.warn("[MSX] Embedded in iframe WITHOUT launch token");
      }
      return result;
    } catch {
      return false;
    }
  });

  const [status, setStatus] = useState<MsxBootStatus>(hasMsxCtx ? "booting" : "idle");
  const [failureReason, setFailureReason] = useState<string | null>(null);

  useEffect(() => {
    if (!hasMsxCtx) {
      setFailureReason(null);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    initMsxListener();

    const boot = async () => {
      setFailureReason(null);
      setStatus("booting");
      console.log("[MSX] Boot gate starting…");

      try {
        console.log("[MSX] Verifying launch token…");
        const ctx = await verifyMsxLaunch();

        if (!ctx || ctx.accessMode !== "full") {
          console.warn("[MSX] Launch verify response:", ctx ? `accessMode=${ctx.accessMode}` : "null");
          throw new Error("bootstrap function failed: launch verify failed or access mode is not full");
        }

        console.log("[MSX] Launch verified — accessMode:", ctx.accessMode);
        console.log("[MSX] Bootstrapping session…");

        const bootstrapResult = await bootstrapMsxSession();
        if (!bootstrapResult.success) {
          throw new Error(bootstrapResult.reason || bootstrapResult.stage || "bootstrap function failed");
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("getSession remained empty: MSX session was not fully restored after setSession");
        }

        console.log("[MSX] Session confirmed — user:", session.user?.id?.slice(0, 8));

        if (!cancelled) {
          console.log("[MSX] Boot status → ready");
          setFailureReason(null);
          setStatus("ready");
        }
      } catch (error: any) {
        const msg = error?.message || "Unknown MSX boot error";
        console.error("[MSX] Boot gate FAILED:", msg);
        if (!cancelled) {
          setFailureReason(msg);
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
      failureReason,
    }),
    [hasMsxCtx, embeddedNoToken, status, failureReason],
  );

  return <MsxBootContext.Provider value={value}>{children}</MsxBootContext.Provider>;
};

export const useMsxBoot = () => {
  const context = useContext(MsxBootContext);

  if (context === defaultMsxBootContext) {
    console.warn("[MSX] useMsxBoot resolved outside provider; falling back to idle state");
  }

  return context;
};