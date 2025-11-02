import { Compass, TrendingUp, Target, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

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

        <div className="grid gap-4">
          <Card className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Career Analytics</h3>
              <p className="text-sm text-muted-foreground">Track your progress and growth</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Target className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Smart Tips</h3>
              <p className="text-sm text-muted-foreground">Personalized advice for your journey</p>
            </div>
          </Card>

          <Card className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-6 w-6 text-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">AI Chat</h3>
              <p className="text-sm text-muted-foreground">Get instant answers about your paths</p>
            </div>
          </Card>
        </div>

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
