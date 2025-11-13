import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  Sparkles,
  Compass,
  Database,
  Crown,
  Zap,
  Eye,
  LineChart,
  MoveRight,
  ArrowRight,
  Check,
} from "lucide-react";

interface IntroOnboardingProps {
  onComplete: () => void;
}

const reasons = [
  "I want a better career path, but I have no clue where to start",
  "I don't know who I'm supposed to become, professionally",
  "I want to land my dream career and lifestyle, but it feels out of reach",
  "I'm trying to recover from burnout and find something that actually feels right",
  "I'm just curious to meet my future self and role",
];

const slides = [
  {
    icon: Compass,
    title: "Why are you here?",
    isSelection: true,
  },
  {
    icon: Sparkles,
    title: "Lowkey, we can help",
    content: "With Naru, you can instantly see the future self that matters to you, and start becoming it today.",
  },
  {
    icon: Eye,
    title: "Our Sauce",
    content:
      "Naru learns from your resume, your voice inputs, and your growth patterns to reveal your future direction. The more you use Naru, the better it gets at guiding you.",
  },
  {
    icon: Database,
    title: "Is Naru another career coach / job copilot?",
    content: "No. Naru is the world’s first database of human potential.",
  },
  {
    icon: Zap,
    title: "The Career OS for Becoming",
    subtitle: "This is how Naru works:",
    items: [
      "Share your resume + some photos",
      "Record what gives you energy",
      "Visualize your future selves",
      "Unlock your career paths",
      "Get daily guidance/insights",
      "Track your evolution",
    ],
  },
  {
    icon: LineChart,
    title: "Collective Intelligence",
    content:
      "Every new Future-Self Card trains our model to predict what real success looks like, so every new user gets a smarter path than the last.",
  },
  {
    icon: ArrowRight,
    title: "One more thing",
    isComparison: true,
  },
];

export const IntroOnboarding = ({ onComplete }: IntroOnboardingProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [visibleItems, setVisibleItems] = useState<number>(0);
  const [selectedReasons, setSelectedReasons] = useState<number[]>([]);
  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLast = currentSlide === slides.length - 1;

  useEffect(() => {
    setVisibleItems(0);
    if (slide.items) {
      const timers: NodeJS.Timeout[] = [];
      slide.items.forEach((_, index) => {
        const timer = setTimeout(
          () => {
            setVisibleItems(index + 1);
          },
          (index + 1) * 600,
        );
        timers.push(timer);
      });
      return () => timers.forEach(clearTimeout);
    }
  }, [currentSlide]);

  const toggleReason = (index: number) => {
    setSelectedReasons((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
  };

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-background via-background to-muted/20">
      <div className="max-w-lg w-full space-y-12 animate-fade-in">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center backdrop-blur-sm border border-primary/10">
            <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
          </div>
        </div>

        {/* Content */}
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-light tracking-wide">{slide.title}</h2>

          {slide.isSelection && (
            <div className="space-y-3 pt-4">
              {reasons.map((reason, index) => (
                <button
                  key={index}
                  onClick={() => toggleReason(index)}
                  className={`w-full p-4 rounded-lg border transition-all duration-300 text-left group ${
                    selectedReasons.includes(index)
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border/40 bg-background/50 hover:border-border hover:bg-background/80"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-5 h-5 rounded border mt-0.5 transition-all duration-300 flex items-center justify-center ${
                        selectedReasons.includes(index) ? "border-primary bg-primary" : "border-border/60 bg-background"
                      }`}
                    >
                      {selectedReasons.includes(index) && (
                        <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
                      )}
                    </div>
                    <span
                      className={`text-sm leading-relaxed transition-colors ${
                        selectedReasons.includes(index) ? "text-foreground font-medium" : "text-muted-foreground"
                      }`}
                    >
                      {reason}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {slide.content && <p className="text-muted-foreground text-base leading-relaxed">{slide.content}</p>}

          {slide.items && (
            <div className="space-y-4 pt-2">
              {slide.subtitle && <p className="text-muted-foreground text-sm">{slide.subtitle}</p>}
              <div className="space-y-4">
                {slide.items.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-3 justify-center transition-all duration-500 ${
                      index < visibleItems ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    }`}
                  >
                    <MoveRight className="w-4 h-4 text-primary" strokeWidth={1.5} />
                    <span className="text-foreground text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {slide.isComparison && (
            <div className="space-y-8 pt-4">
              <div className="grid grid-cols-2 gap-6">
                {/* LinkedIn Column */}
                <div className="space-y-4">
                  <div className="text-xs font-medium tracking-wider text-muted-foreground/60 uppercase">LinkedIn</div>
                  <div className="space-y-3">
                    {["Tracking past", "Vanity", "Static", "No guidance", "No rewards", "Not AI-native"].map(
                      (item, i) => (
                        <div key={i} className="text-sm text-muted-foreground/50 font-light">
                          {item}
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* Naru Column */}
                <div className="space-y-4">
                  <div className="text-xs font-medium tracking-wider text-primary uppercase">Naru</div>
                  <div className="space-y-3">
                    {[
                      "Tracking future",
                      "Value",
                      "Dynamic predictions",
                      "Personalized guidance",
                      "Rewards",
                      "AI-native",
                    ].map((item, i) => (
                      <div key={i} className="text-sm text-foreground font-light">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress & Navigation */}
        <div className="space-y-6">
          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {slides.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all ${
                  index === currentSlide ? "w-8 bg-primary" : "w-1.5 bg-primary/20"
                }`}
              />
            ))}
          </div>

          {/* Button */}
          <Button
            onClick={handleNext}
            disabled={slide.isSelection && selectedReasons.length === 0}
            className="w-full h-11 text-base font-medium group disabled:opacity-50"
          >
            {isLast ? "Begin Your Journey" : "Continue"}
            <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
