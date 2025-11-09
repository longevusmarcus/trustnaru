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
} from "lucide-react";

interface IntroOnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Sparkles,
    title: "The Problem",
    content: "You don't know who you're becoming professionally, who you should become, or how to get there.",
  },
  {
    icon: Compass,
    title: "The Solution",
    content: "Instantly see your future self, and how to become it.",
  },
  {
    icon: Database,
    title: "Our Moat",
    content:
      "Naru learns from your background, your energy, and your growth patterns to reveal your future direction. The more you use Naru, the better it gets at guiding you.",
  },
  {
    icon: Zap,
    title: "The OS for Becoming",
    subtitle: "Naru will evolve into the OS for Becoming:",
    items: [
      "Share what gives you energy",
      "Visualize your future selves",
      "Unlock your career paths",
      "Get daily guidance/insights",
      "Track your evolution",
    ],
  },
  {
    icon: Eye,
    title: "Is Naru another career coach / job copilot?",
    content: "No. No. Once you use it, you'll understand.",
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
                    {["Tracking past", "Vanity", "Static", "No guidance", "No rewards"].map((item, i) => (
                      <div key={i} className="text-sm text-muted-foreground/50 font-light">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Naru Column */}
                <div className="space-y-4">
                  <div className="text-xs font-medium tracking-wider text-primary uppercase">Naru</div>
                  <div className="space-y-3">
                    {["Tracking future", "Value", "Dynamic predictions", "Personalized guidance", "Rewards"].map(
                      (item, i) => (
                        <div key={i} className="text-sm text-foreground font-light">
                          {item}
                        </div>
                      ),
                    )}
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
          <Button onClick={handleNext} className="w-full h-11 text-base font-medium group">
            {isLast ? "Begin Your Journey" : "Continue"}
            <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
