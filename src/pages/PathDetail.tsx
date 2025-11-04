import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export default function PathDetail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activating, setActivating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const card = location.state?.card;

  if (!card) {
    navigate("/");
    return null;
  }

  const handleActivatePath = async () => {
    if (!user || !card.id) return;
    
    setActivating(true);
    try {
      // Update user profile with active path
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          active_path_id: card.id
        }, {
          onConflict: 'user_id'
        });

      if (profileError) throw profileError;

      // Generate goals for this path
      const { error: goalsError } = await supabase.functions.invoke('generate-goals', {
        body: { pathId: card.id, userId: user.id }
      });

      if (goalsError) {
        console.error('Error generating goals:', goalsError);
        toast({
          title: "Path activated",
          description: "Path activated successfully, but goal generation is taking longer than expected.",
        });
      } else {
        toast({
          title: "Path activated!",
          description: "Your personalized goals are ready.",
        });
      }

      // Navigate to copilot page with a slight delay to ensure state is updated
      setTimeout(() => {
        navigate("/", { state: { navigateTo: "copilot" } });
      }, 500);
    } catch (error) {
      console.error('Error activating path:', error);
      toast({
        title: "Activation failed",
        description: "Failed to activate this path. Please try again.",
        variant: "destructive"
      });
    } finally {
      setActivating(false);
    }
  };

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
        <div className="relative h-64 -mx-4 mb-6 cursor-pointer" onClick={() => setSelectedImage(card.image)}>
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
            <div 
              key={imgIndex} 
              className="aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setSelectedImage(img)}
            >
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

        {/* Typical Day Routine */}
        {card.typicalDayRoutine && card.typicalDayRoutine.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">Typical Day</h2>
            <div className="space-y-2">
              {card.typicalDayRoutine.map((activity: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 py-2">
                  <div className="h-2 w-2 rounded-full bg-foreground/40 mt-1.5 flex-shrink-0" />
                  <p className="text-sm text-foreground/90">{activity}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lifestyle */}
        {card.lifestyleBenefits && card.lifestyleBenefits.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-muted-foreground mb-4">Lifestyle Benefits</h2>
            <div className="space-y-2">
              {card.lifestyleBenefits.map((benefit: string, idx: number) => (
                <div key={idx} className="flex items-start gap-3 py-2">
                  <div className="h-2 w-2 rounded-full bg-foreground/40 mt-1.5 flex-shrink-0" />
                  <p className="text-sm text-foreground/90">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button 
          className="w-full" 
          size="lg" 
          onClick={handleActivatePath}
          disabled={activating}
        >
          {activating ? "Activating..." : "Activate This Path"}
        </Button>
      </div>

      {/* Image Viewer Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-full max-h-full w-screen h-screen p-0 border-0 bg-black/95">
          <div className="relative w-full h-full flex items-center justify-center">
            {selectedImage && (
              <img 
                src={selectedImage} 
                alt="Full view" 
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
