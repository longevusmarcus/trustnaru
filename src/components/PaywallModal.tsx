import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaywallModal = ({ isOpen, onClose }: PaywallModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Error",
        description: "Failed to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    "AI-powered career path discovery",
    "Personalized daily missions",
    "Voice-based career coaching",
    "CV analysis & optimization",
    "Unlimited path explorations",
    "Early founder pricing locked forever",
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/95 backdrop-blur-xl"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute -top-12 right-0 p-2 text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Content */}
            <div className="text-center space-y-8">
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground/70"
              >
                <Sparkles className="h-3 w-3" />
                Early Founders
              </motion.div>

              {/* Heading */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="space-y-3"
              >
                <h2 className="text-3xl font-light text-foreground">
                  Unlock Your
                  <br />
                  <span className="font-cormorant italic">Full Potential</span>
                </h2>
                <p className="text-sm text-muted-foreground/80 max-w-xs mx-auto">
                  Join the founding members shaping their future with the first career OS
                </p>
              </motion.div>

              {/* Price */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-1"
              >
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-light text-foreground">$29</span>
                  <span className="text-muted-foreground/60">/year</span>
                </div>
                <p className="text-xs text-muted-foreground/50">Less than $2.50/month</p>
              </motion.div>

              {/* Features */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="space-y-3 text-left max-w-xs mx-auto"
              >
                {features.map((feature, index) => (
                  <div key={index} className="flex items-start gap-3 text-sm">
                    <Check className="h-4 w-4 text-foreground/60 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">{feature}</span>
                  </div>
                ))}
              </motion.div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4 pt-4"
              >
                <Button
                  onClick={handleSubscribe}
                  disabled={isLoading}
                  className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 rounded-full font-light tracking-wide"
                >
                  {isLoading ? "Loading..." : "Start Your Journey"}
                </Button>
                <p className="text-[10px] text-muted-foreground/40">Cancel anytime · Secure payment via Stripe</p>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
