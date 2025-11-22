import { Circle } from "lucide-react";
import { useEffect, useState } from "react";

export const ProcessingStep = () => {
  const [seconds, setSeconds] = useState(180);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-8">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 via-primary/30 to-primary/10 flex items-center justify-center animate-pulse backdrop-blur-sm border border-primary/20">
          <Circle className="h-16 w-16 text-primary/70 fill-primary/5" strokeWidth={1} />
        </div>
        <div
          className="absolute inset-0 rounded-full border border-primary/30 animate-ping"
          style={{ animationDuration: "2s" }}
        />
        <div
          className="absolute inset-0 rounded-full border border-primary/20 animate-pulse"
          style={{ animationDuration: "3s" }}
        />
      </div>

      <div className="text-center space-y-3 max-w-md">
        <h2 className="text-2xl font-bold">
          Creating Your Future Self (Hold on! Leaving this page will reset your progress)
        </h2>
        <p className="text-muted-foreground text-lg">Mapping your energy, skills, and future possibilities…</p>
        <div className="pt-2 text-xs text-muted-foreground/60 font-mono tracking-wider">{formatTime(seconds)}</div>
      </div>

      <div className="space-y-2 text-sm text-muted-foreground text-center">
        <p className="animate-pulse">Analyzing your skills and experience</p>
        <p className="animate-pulse" style={{ animationDelay: "0.5s" }}>
          Understanding your visual identity
        </p>
        <p className="animate-pulse" style={{ animationDelay: "1s" }}>
          Recognizing your emotional patterns
        </p>
      </div>
    </div>
  );
};
