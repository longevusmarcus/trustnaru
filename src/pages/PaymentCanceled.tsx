import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const PaymentCanceled = () => {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);
  const { user } = useAuth();
  const hasTracked = useRef(false);

  useEffect(() => {
    // Track abandoned checkout event
    const trackAbandonment = async () => {
      if (user && !hasTracked.current) {
        hasTracked.current = true;
        await supabase.from("checkout_events").insert({
          user_id: user.id,
          event_type: "abandoned",
          price_id: "price_1SrFUF2LCwPxHz0nXWGYrqg7",
        });
      }
    };
    trackAbandonment();

    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, [user]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 15,
            delay: 0.1 
          }}
          className="mx-auto w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
          >
            <ArrowLeft className="w-8 h-8 text-muted-foreground" strokeWidth={1.5} />
          </motion.div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 20 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="space-y-3"
        >
          <h1 className="text-2xl font-light tracking-tight text-foreground">
            No worries
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your checkout was canceled. You can continue exploring or come back when you're ready.
          </p>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 20 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="space-y-3"
        >
          <Button
            onClick={() => navigate("/app")}
            className="w-full h-12 text-base font-normal"
          >
            Continue Exploring
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="w-full h-10 text-sm text-muted-foreground"
          >
            Back to Home
          </Button>
        </motion.div>

        {/* Subtle note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: showContent ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-xs text-muted-foreground/60"
        >
          Early founder pricing is available for a limited time
        </motion.p>
      </div>
    </div>
  );
};

export default PaymentCanceled;
