import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface SubscriptionState {
  isSubscribed: boolean;
  isLoading: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    isSubscribed: false,
    isLoading: true,
    productId: null,
    subscriptionEnd: null
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState({
        isSubscribed: false,
        isLoading: false,
        productId: null,
        subscriptionEnd: null
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
        subscriptionEnd: data?.subscription_end ?? null
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
    if (urlParams.get('success') === 'true') {
      // Remove the success param from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Recheck subscription after a short delay
      setTimeout(checkSubscription, 2000);
    }
  }, [checkSubscription]);

  return {
    ...state,
    refetch: checkSubscription
  };
};
