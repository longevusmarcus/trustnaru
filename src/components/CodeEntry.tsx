import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CodeEntryProps {
  onSuccess: () => void;
}

export const CodeEntry = ({ onSuccess }: CodeEntryProps) => {
  const [code, setCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedCode = code.toLowerCase().trim();
    
    if (!trimmedCode) {
      toast({
        title: "Enter a code",
        description: "Please enter your access code",
        variant: "destructive"
      });
      return;
    }

    setIsValidating(true);

    // Validate code format in frontend
    const isValidCode = 
      trimmedCode === "become" || 
      trimmedCode === "naruvipgary" ||
      trimmedCode === "naruvipjeff" ||
      trimmedCode === "naruvipmarco";

    if (!isValidCode) {
      toast({
        title: "Invalid code",
        description: "This code is not valid",
        variant: "destructive"
      });
      setCode("");
      setIsValidating(false);
      return;
    }

    // Store code in localStorage to track usage after signup
    localStorage.setItem("access_code", trimmedCode);

    // Success!
    setTimeout(() => {
      onSuccess();
    }, 500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-background via-background to-muted/20">
      <div className="w-full max-w-sm space-y-12 animate-fade-in">
        {/* Floating Emerald Bubble */}
        <div className="flex justify-center">
          <div className="w-32 h-32 relative">
            {/* Outer glow with elegant pulse */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/30 to-emerald-600/20 rounded-full blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
            
            {/* Middle glow layer */}
            <div className="absolute inset-3 bg-gradient-to-br from-emerald-300/40 to-emerald-500/30 rounded-full blur-2xl animate-[pulse_3s_ease-in-out_infinite]" />
            
            {/* Crystal ball container */}
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-400/20 via-emerald-300/15 to-emerald-500/25 backdrop-blur-sm flex items-center justify-center border border-emerald-400/20 shadow-2xl animate-[pulse_3.5s_ease-in-out_infinite]">
              {/* Inner sphere with light reflection */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400/30 via-emerald-300/20 to-emerald-600/30 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/30 blur-md" />
                <div className="absolute bottom-5 left-5 w-9 h-9 rounded-full bg-emerald-200/20 blur-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Code Entry Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter code"
            disabled={isValidating}
            className="h-12 text-center text-lg tracking-wider bg-background/50 border-muted/40 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-muted/40 transition-colors disabled:opacity-50"
            autoFocus
          />
          <Button type="submit" disabled={isValidating} className="w-full h-12">
            {isValidating ? (
              <span className="inline-flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Validating...
              </span>
            ) : (
              "Join Private Beta (Founder Status)"
            )}
          </Button>
          {isValidating && (
            <p className="text-center text-sm text-muted-foreground">Validating code...</p>
          )}
        </form>
      </div>
    </div>
  );
};