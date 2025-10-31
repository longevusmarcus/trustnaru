import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PathDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const card = location.state?.card;

  if (!card) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">{card.title}</h1>
        </div>
      </div>

      <div className="px-4 pb-8">
        {/* Hero Image */}
        <div className="relative h-64 -mx-4 mb-6">
          <img 
            src={card.image} 
            alt={card.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* Path Images */}
        <div className="grid grid-cols-3 gap-2 mb-8">
          {card.pathImages.map((img: string, imgIndex: number) => (
            <div key={imgIndex} className="aspect-square rounded-lg overflow-hidden">
              <img src={img} alt={`Step ${imgIndex + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>

        {/* Roadmap */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Roadmap</h2>
          <div className="space-y-2">
            {card.roadmap.map((step: any, stepIndex: number) => (
              <div key={stepIndex} className="flex items-start gap-3 py-3 border-b border-border last:border-0">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{step.step}</p>
                  <p className="text-xs text-muted-foreground mt-1">{step.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Affirmations */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Affirmations</h2>
          <div className="space-y-3">
            {card.affirmations.map((affirmation: string, affIndex: number) => (
              <p key={affIndex} className="text-sm italic text-foreground/90 py-2 border-l-2 border-foreground/20 pl-4">
                {affirmation}
              </p>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <Button className="w-full" size="lg" onClick={() => navigate("/")}>
          Activate This Path
        </Button>
      </div>
    </div>
  );
}
