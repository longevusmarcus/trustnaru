import { Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

export const MobileOnly = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-4 animate-fade-in">
        {/* Crystal Ball Logo */}
        <div className="flex justify-center">
          <div className="w-20 h-20 relative">
            {/* Outer glow with elegant pulse */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/30 to-emerald-600/20 rounded-full blur-2xl animate-[pulse_4s_ease-in-out_infinite]" />
            
            {/* Crystal ball container */}
            <div className="relative w-full h-full rounded-full bg-gradient-to-br from-emerald-400/20 via-emerald-300/15 to-emerald-500/25 backdrop-blur-sm flex items-center justify-center border border-emerald-400/20 shadow-2xl animate-[pulse_3.5s_ease-in-out_infinite]">
              {/* Inner sphere with light reflection */}
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400/30 via-emerald-300/20 to-emerald-600/30 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white/30 blur-sm" />
                <div className="absolute bottom-3 left-3 w-5 h-5 rounded-full bg-emerald-200/20 blur-md" />
              </div>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card/80 backdrop-blur-sm rounded-3xl shadow-2xl p-6 border border-muted/30">
          {/* Mobile Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-7 h-7 text-primary" strokeWidth={1.5} />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-center text-2xl font-light tracking-wide mb-2">
            Naru
          </h1>

          {/* Heading */}
          <h2 className="text-center text-lg font-semibold mb-3">
            Mobile experience only
          </h2>

          {/* Description */}
          <p className="text-center text-sm text-muted-foreground leading-relaxed mb-4">
            Naru is designed for your mobile device. Please visit this app on your smartphone for the best experience.
          </p>

          {/* QR Code Section */}
          <div className="pt-4 border-t border-muted/30">
            <p className="text-center text-xs text-muted-foreground mb-3">
              Scan to open on mobile
            </p>
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-xl shadow-lg">
                <QRCodeSVG 
                  value={window.location.origin}
                  size={120}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
