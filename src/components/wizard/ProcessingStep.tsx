import { Sparkles } from "lucide-react";

export const ProcessingStep = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-8">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-foreground/20 to-foreground/10 animate-pulse flex items-center justify-center">
          <Sparkles className="h-12 w-12 text-foreground/60 animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div className="absolute inset-0 rounded-full border-4 border-foreground/10 animate-ping" style={{ animationDuration: '2s' }} />
      </div>

      <div className="text-center space-y-3 max-w-md">
        <h2 className="text-2xl font-bold">Creating Your Future Self</h2>
        <p className="text-muted-foreground text-lg">
          Mapping your energy, skills, and future possibilities…
        </p>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground text-center">
        <p className="animate-pulse">Analyzing your skills and experience</p>
        <p className="animate-pulse" style={{ animationDelay: '0.5s' }}>Understanding your visual identity</p>
        <p className="animate-pulse" style={{ animationDelay: '1s' }}>Recognizing your emotional patterns</p>
      </div>
    </div>
  );
};
