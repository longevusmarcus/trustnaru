import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import compassIcon from "@/assets/insights-compass.png";
import analyticsIcon from "@/assets/insights-analytics.png";
import tipsIcon from "@/assets/insights-tips.png";
import chatIcon from "@/assets/insights-chat.png";

interface InsightFeature {
  id: string;
  icon: string;
  title: string;
  description: string;
  action: string;
}

const features: InsightFeature[] = [
  {
    id: "guidance",
    icon: compassIcon,
    title: "Daily Guidance",
    description: "AI-powered insights based on your recent progress",
    action: "Get Guidance"
  },
  {
    id: "analytics",
    icon: analyticsIcon,
    title: "Career Analytics",
    description: "Track your progress and growth patterns",
    action: "View Analytics"
  },
  {
    id: "tips",
    icon: tipsIcon,
    title: "Smart Tips",
    description: "Personalized advice for your journey",
    action: "Get Tips"
  },
  {
    id: "chat",
    icon: chatIcon,
    title: "AI Chat",
    description: "Get instant answers about your paths",
    action: "Start Chat"
  }
];

export const InsightsPage = () => {
  const { toast } = useToast();
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const handleFeatureClick = (feature: InsightFeature) => {
    setSelectedFeature(feature.id);
    toast({
      title: "Coming soon",
      description: `${feature.title} will be available soon`,
    });
    setTimeout(() => setSelectedFeature(null), 1000);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-md mx-auto px-6 pt-8 space-y-8">
        {/* Hero Feature */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="p-8 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold">Daily Guidance</h2>
                <p className="text-sm text-muted-foreground">
                  Get AI-powered insights based on your recent progress
                </p>
              </div>

              <Button 
                onClick={() => handleFeatureClick(features[0])}
                disabled={selectedFeature === "guidance"}
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-full h-12 text-base font-medium shadow-lg shadow-primary/20"
              >
                {selectedFeature === "guidance" ? "Loading..." : "Get Today's Guidance"}
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Feature Grid */}
        <div className="space-y-4">
          {features.slice(1).map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
            >
              <Card 
                className="border-0 bg-card hover:shadow-md transition-all duration-300 cursor-pointer group"
                onClick={() => handleFeatureClick(feature)}
              >
                <div className="p-6 flex items-center gap-5">
                  <div className="relative flex-shrink-0">
                    <img 
                      src={feature.icon} 
                      alt={feature.title} 
                      className="h-10 w-10 object-contain opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {feature.description}
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300">
                      <svg 
                        className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-300" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* This Week Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="pt-4"
        >
          <h2 className="text-xl font-semibold mb-4">This Week</h2>
          <Card className="border-0 bg-card/50">
            <div className="p-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                <svg 
                  className="h-6 w-6 text-muted-foreground" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <p className="text-sm text-muted-foreground max-w-[250px]">
                Your insights will appear here as you interact with your paths
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
