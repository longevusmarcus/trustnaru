import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  bootstrapMsxSession,
  initMsxListener,
  isInsideMsx,
  persistMsxLaunchParams,
  verifyMsxLaunch,
} from "@/lib/msxBridge";

export type MsxBootStatus = "idle" | "booting" | "ready" | "failed";

interface MsxBootContextValue {
  hasMsxLaunchContext: boolean;
  status: MsxBootStatus;
}

const MsxBootContext = createContext<MsxBootContextValue | undefined>(undefined);

export const MsxOpeningScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
    <p className="text-sm text-muted-foreground">Opening in MSX...</p>
  </div>
);

export const MsxBootProvider = ({ children }: { children: ReactNode }) => {
  const [hasMsxLaunchContext] = useState<boolean>(() => {
    persistMsxLaunchParams();
    return isInsideMsx();
  });
  const [status, setStatus] = useState<MsxBootStatus>(hasMsxLaunchContext ? "booting" : "idle");

  useEffect(() => {
    if (!hasMsxLaunchContext) {
      setStatus("idle");
      return;
    }

    let cancelled = false;
    initMsxListener();

    const boot = async () => {
      setStatus("booting");

      try {
        const ctx = await verifyMsxLaunch();

        if (!ctx || ctx.accessMode !== "full") {
          throw new Error("MSX launch verification failed or access mode is not full");
        }

        const bootstrapped = await bootstrapMsxSession();
        if (!bootstrapped) {
          throw new Error("MSX session bootstrap failed");
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("MSX session was not fully restored");
        }

        if (!cancelled) {
          setStatus("ready");
        }
      } catch (error) {
        console.warn("[MSX] Boot gate failed:", error);
        if (!cancelled) {
          setStatus("failed");
        }
      }
    };

    void boot();

    return () => {
      cancelled = true;
    };
  }, [hasMsxLaunchContext]);

  const value = useMemo(
    () => ({ hasMsxLaunchContext, status }),
    [hasMsxLaunchContext, status],
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
