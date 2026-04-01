import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { hasMsxFullAccess } from "@/lib/msxBridge";

interface SubscriptionState {
  isSubscribed: boolean;
  isLoading: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  isMsxEntitled: boolean;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const hasShownSuccessToast = useRef(false);
  const [state, setState] = useState<SubscriptionState>({
    isSubscribed: false,
    isLoading: true,
    productId: null,
    subscriptionEnd: null,
    isMsxEntitled: false,
  });

  const checkSubscription = useCallback(async () => {
    // Check MSX entitlement first — if user launched from MSX with full access, bypass paywall
    const msxEntitled = hasMsxFullAccess();
    if (msxEntitled) {
      console.log("[MSX] Full access detected — bypassing subscription check");
      setState({
        isSubscribed: true,
        isLoading: false,
        productId: "msx_included",
        subscriptionEnd: null,
        isMsxEntitled: true,
      });
      return;
    }

    if (!user) {
      setState({
        isSubscribed: false,
        isLoading: false,
        productId: null,
        subscriptionEnd: null,
        isMsxEntitled: false,
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        console.error('Subscription check error:', error);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      setState({
        isSubscribed: data?.subscribed ?? false,
        isLoading: false,
        productId: data?.product_id ?? null,
        subscriptionEnd: data?.subscription_end ?? null,
        isMsxEntitled: false,
      });
    } catch (error) {
      console.error('Subscription check error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Check for success parameter in URL (post-checkout)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true' && !hasShownSuccessToast.current) {
      hasShownSuccessToast.current = true;
      
      // Remove the success param from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Show success toast
      toast({
        title: "🎉 Welcome, Early Founder!",
        description: "Your subscription is now active. Let's build your future together!",
      });
      
      // Recheck subscription after a short delay
      setTimeout(checkSubscription, 2000);
    }
  }, [checkSubscription, toast]);

  return {
    ...state,
    refetch: checkSubscription
  };
};
