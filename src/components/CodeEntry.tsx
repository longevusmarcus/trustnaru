import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface CodeEntryProps {
  onSuccess: () => void;
}

export const CodeEntry = ({ onSuccess }: CodeEntryProps) => {
  const [code, setCode] = useState("");
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.toLowerCase().trim() === "become") {
      onSuccess();
    } else {
      toast({
        title: "Invalid code",
        description: "Please enter the correct code",
        variant: "destructive"
      });
      setCode("");
    }
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
            className="h-12 text-center text-lg tracking-wider bg-background/50 border-muted/40 focus-visible:border-emerald-400/50 transition-colors"
            autoFocus
          />
        </form>
      </div>
    </div>
  );
};
