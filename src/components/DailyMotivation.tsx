import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Download, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import html2canvas from "html2canvas";

interface DailyMotivationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathTitle?: string;
}

const generateMotivation = (pathTitle?: string): string => {
  if (!pathTitle) {
    return "Today is a great day to get closer to your dreams.";
  }

  const motivations = [
    `Today is a great day to get closer to your ${pathTitle} dream.`,
    `Don't stop believing you can become what you want.`,
    `Every step forward is a step toward ${pathTitle}.`,
    `Your ${pathTitle} journey starts with today.`,
    `Believe in your ability to change your life.`,
    `Great things take time. Keep going.`,
    `You are exactly where you need to be.`,
    `Trust the process. Trust yourself.`,
  ];

  return motivations[Math.floor(Math.random() * motivations.length)];
};

export const DailyMotivation = ({ open, onOpenChange, pathTitle }: DailyMotivationProps) => {
  const motivation = generateMotivation(pathTitle);
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!contentRef.current) return;
    
    try {
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#000000',
        scale: 2,
      });
      
      const link = document.createElement('a');
      link.download = 'motivation.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      toast({
        title: "Downloaded!",
        description: "Your motivation has been saved.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download image.",
        variant: "destructive",
      });
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    if (!isLiked) {
      toast({
        title: "Liked!",
        description: "This motivation has been saved to your favorites.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-screen border-none p-0 flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <div ref={contentRef} className="flex flex-col items-center justify-center px-8 py-16 max-w-2xl mx-auto space-y-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-center leading-tight tracking-tight">
            {motivation}
          </h1>

          <div className="flex gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 opacity-60 hover:opacity-100 transition-opacity"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full h-10 w-10 opacity-60 hover:opacity-100 transition-opacity ${isLiked ? 'text-red-500' : ''}`}
              onClick={handleLike}
            >
              <Heart className="h-4 w-4" fill={isLiked ? "currentColor" : "none"} />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
