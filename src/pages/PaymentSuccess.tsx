import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Small delay for dramatic effect
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Success checkmark */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            type: "spring", 
            stiffness: 200, 
            damping: 15,
            delay: 0.1 
          }}
          className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
          >
            <Check className="w-10 h-10 text-primary" strokeWidth={2.5} />
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
            Welcome, Early Founder
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your subscription is now active. You've joined an exclusive group of pioneers shaping the future of career guidance.
          </p>
        </motion.div>

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 20 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="space-y-4 py-6 border-t border-b border-border/50"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm text-foreground">Unlimited path generation</p>
              <p className="text-xs text-muted-foreground">Explore every possibility</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-left">
            <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm text-foreground">Personalized AI guidance</p>
              <p className="text-xs text-muted-foreground">Tailored to your journey</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-left">
            <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm text-foreground">Early founder benefits</p>
              <p className="text-xs text-muted-foreground">Locked in forever</p>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 20 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <Button
            onClick={() => navigate("/app")}
            className="w-full h-12 text-base font-normal"
          >
            Start Exploring
          </Button>
        </motion.div>

        {/* Subtle footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: showContent ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 1 }}
          className="text-xs text-muted-foreground/60"
        >
          A receipt has been sent to your email
        </motion.p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
