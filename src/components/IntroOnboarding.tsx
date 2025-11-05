import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Sparkles, Compass, Database, Crown, Zap, Eye, LineChart, MoveRight } from "lucide-react";

interface IntroOnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Sparkles,
    title: "The Problem",
    content: "People don't know who they're becoming, or how to become it.",
  },
  {
    icon: Compass,
    title: "The Solution",
    content: "Instantly see your future self, and how to become it.",
  },
  {
    icon: Database,
    title: "Our Moat",
    content: "Proprietary dataset of human potential.",
  },
  {
    icon: Crown,
    title: "The Vision",
    content:
      "The OS for becoming. By reverse-engineering career and life success, we’re transforming career development to help people realize their full potential.",
  },
  {
    icon: Zap,
    title: "Life OS",
    subtitle: "Naru will evolve into the Life OS:",
    items: [
      "Align your energy",
      "See your future self",
      "Unlock your career paths",
      "Take action every day",
      "Track your evolution",
    ],
  },
  {
    icon: Eye,
    title: "Is Naru another career coach / job copilot?",
    content: '"No, it's about who you can become, who you should become, and how to get there"',
  },
  {
    icon: LineChart,
    title: "Collective Intelligence",
    content:
      "Every new Future-Self Card trains our model to predict what real success looks like, so every new user gets a smarter path than the last.",
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
