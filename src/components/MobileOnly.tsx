import { Smartphone } from "lucide-react";

export const MobileOnly = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10 flex items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        {/* Crystal Ball Logo */}
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

        {/* Card */}
        <div className="bg-card/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-muted/30">
          {/* Mobile Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-10 h-10 text-primary" strokeWidth={1.5} />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-center text-3xl font-light tracking-wide mb-3">
            Naru
          </h1>

          {/* Heading */}
          <h2 className="text-center text-xl font-semibold mb-4">
            Mobile experience only
          </h2>

          {/* Description */}
          <p className="text-center text-muted-foreground leading-relaxed">
            Naru is designed for your mobile device. Please visit this app on your smartphone for the best experience.
          </p>
        </div>
      </div>
    </div>
  );
};
