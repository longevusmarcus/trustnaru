import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Target, Compass, Database, Rocket, Zap, Eye, Activity, TrendingUp } from "lucide-react";

interface IntroOnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Target,
    title: "The Problem",
    content: "People don't know who they're becoming, or how to become it.",
  },
  {
    icon: Compass,
    title: "The Solution",
    content: "Instantly see your future self and path.",
  },
  {
    icon: Database,
    title: "Our Moat",
    content: "Proprietary dataset of human potential. Naru is building the first Future-Intelligence Platform, helping people forecast who they'll become, and showing them how to get there.",
  },
  {
    icon: Rocket,
    title: "The Vision",
    content: "The OS for becoming. We're turning self-development into a science, so every person can live the life they were meant for.",
  },
  {
    icon: Zap,
    title: "Life OS",
    subtitle: "Path Genius will evolve into the Life OS:",
    items: [
      "Align your energy",
      "See your future self",
      "Take action every day",
      "Track your evolution over years",
    ],
  },
  {
    icon: Eye,
    title: "Your Journey",
    content: "This is who I could become, and here's how.",
  },
  {
    icon: TrendingUp,
    title: "Collective Intelligence",
    content: "Every new Future-Self Card trains our model to predict what real success looks like — so every new user gets a smarter path than the last.",
  },
];

export const IntroOnboarding = ({ onComplete }: IntroOnboardingProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLast = currentSlide === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-background via-background to-muted/20">
      <div className="max-w-lg w-full space-y-12 animate-fade-in">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <Icon className="w-8 h-8 text-primary" />
          </div>
        </div>

        {/* Content */}
        <div className="text-center space-y-6">
          <h2 className="text-2xl font-light tracking-wide">{slide.title}</h2>
          
          {slide.content && (
            <p className="text-muted-foreground text-base leading-relaxed">
              {slide.content}
            </p>
          )}

          {slide.items && (
            <div className="space-y-4 pt-2">
              {slide.subtitle && (
                <p className="text-muted-foreground text-sm">{slide.subtitle}</p>
              )}
              <div className="space-y-3">
                {slide.items.map((item, index) => (
                  <div key={index} className="flex items-center gap-3 justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
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
                  index === currentSlide 
                    ? 'w-8 bg-primary' 
                    : 'w-1.5 bg-primary/20'
                }`}
              />
            ))}
          </div>

          {/* Button */}
          <Button 
            onClick={handleNext}
            className="w-full h-11 text-base font-medium group"
          >
            {isLast ? 'Begin Your Journey' : 'Continue'}
            <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
