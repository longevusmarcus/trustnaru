import { Compass, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

export const InsightsPage = () => {
  const { toast } = useToast();

  const handleGetGuidance = () => {
    toast({
      title: "Coming soon",
      description: "AI-powered daily guidance will be available soon",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-serif italic">Insights</h1>
          <p className="text-muted-foreground">Your intuition patterns over time</p>
        </div>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Compass className="h-6 w-6 text-foreground" />
            </div>
            <h2 className="text-2xl font-semibold">Daily Guidance</h2>
          </div>
          
          <p className="text-muted-foreground">
            Get AI-powered insights based on your recent check-ins
          </p>

          <Button 
            onClick={handleGetGuidance}
            className="w-full bg-primary hover:bg-primary/90 text-white rounded-full py-6 text-lg"
          >
            Get Today's Guidance
          </Button>
        </Card>

        <Card className="p-6 flex flex-col items-center justify-center space-y-4 min-h-[200px]">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Heart className="h-8 w-8 text-foreground" />
          </div>
          <p className="text-center text-muted-foreground">
            Start checking in to build your trust score
          </p>
        </Card>

        <div className="pt-4">
          <h2 className="text-2xl font-semibold mb-4">This Week</h2>
          <Card className="p-6">
            <p className="text-center text-muted-foreground">
              Your insights will appear here as you interact with your paths
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
