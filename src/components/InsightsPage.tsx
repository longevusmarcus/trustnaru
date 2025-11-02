import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

interface InsightFeature {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  action: string;
}

const CompassIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>
);

const AnalyticsIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

const TipsIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9 18h6"/>
    <path d="M10 22h4"/>
    <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
  </svg>
);

const ChatIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    <circle cx="9" cy="10" r="0.5" fill="currentColor"/>
    <circle cx="12" cy="10" r="0.5" fill="currentColor"/>
    <circle cx="15" cy="10" r="0.5" fill="currentColor"/>
  </svg>
);

const features: InsightFeature[] = [
  {
    id: "guidance",
    icon: <CompassIcon />,
    title: "Daily Guidance",
    description: "AI-powered insights based on your recent progress",
    action: "Get Guidance"
  },
  {
    id: "analytics",
    icon: <AnalyticsIcon />,
    title: "Career Analytics",
    description: "Track your progress and growth patterns",
    action: "View Analytics"
  },
  {
    id: "tips",
    icon: <TipsIcon />,
    title: "Smart Tips",
    description: "Personalized advice for your journey",
    action: "Get Tips"
  },
  {
    id: "chat",
    icon: <ChatIcon />,
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
      <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
        {/* Hero Feature */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="p-6 space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Daily Guidance</h2>
                <p className="text-sm text-muted-foreground/80">
                  Get AI-powered insights based on your recent progress
                </p>
              </div>

              <Button 
                onClick={() => handleFeatureClick(features[0])}
                disabled={selectedFeature === "guidance"}
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-full h-11 text-sm font-medium shadow-sm"
              >
                {selectedFeature === "guidance" ? "Loading..." : "Get Today's Guidance"}
              </Button>
            </div>
          </Card>
        </motion.div>

        {/* Feature Grid */}
        <div className="space-y-3">
          {features.slice(1).map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
            >
              <Card 
                className="border-0 bg-card hover:bg-card/80 transition-all duration-200 cursor-pointer group"
                onClick={() => handleFeatureClick(feature)}
              >
                <div className="p-4 flex items-center gap-4">
                  <div className="relative flex-shrink-0 text-muted-foreground/60 group-hover:text-primary transition-colors duration-200">
                    <div className="group-hover:scale-105 transition-transform duration-200">
                      {feature.icon}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm mb-0.5">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground/70 line-clamp-1">
                      {feature.description}
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    <svg 
                      className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary/60 transition-colors duration-200" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
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
          className="pt-2"
        >
          <h2 className="text-base font-semibold mb-3 px-1">This Week</h2>
          <Card className="border-0 bg-card/50">
            <div className="p-6 flex flex-col items-center justify-center text-center space-y-2">
              <div className="h-10 w-10 rounded-full bg-muted/30 flex items-center justify-center">
                <svg 
                  className="h-5 w-5 text-muted-foreground/50" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              </div>
              <p className="text-xs text-muted-foreground/70 max-w-[250px]">
                Your insights will appear here as you interact with your paths
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
