import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Download, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

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
  const contentRef = useRef<HTMLDivElement>(null);
  const [isLiked, setIsLiked] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    if (!contentRef.current) return;

    try {
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: null,
        scale: 2,
      });
      
      const link = document.createElement("a");
      link.download = `naru-motivation-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast({
        title: "Downloaded!",
        description: "Your motivation has been saved.",
      });
    } catch (err) {
      console.error("Download failed:", err);
      toast({
        title: "Download failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    if (!isLiked) {
      toast({
        title: "Saved to favorites",
        description: "This motivation has been liked.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-screen border-none p-0 flex items-center justify-center bg-background/95 backdrop-blur-sm" hideCloseButton>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-8 top-8 rounded-full opacity-70 hover:opacity-100 transition-opacity z-10"
          onClick={() => onOpenChange(false)}
        >
          <X className="h-6 w-6" />
        </Button>

        <div ref={contentRef} className="flex flex-col items-center justify-center px-8 py-16 max-w-2xl mx-auto space-y-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-center leading-tight tracking-tight">
            {motivation}
          </h1>

          <div className="flex gap-6 opacity-50">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-12 w-12 hover:opacity-100 transition-opacity"
              onClick={handleDownload}
            >
              <Download className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={`rounded-full h-12 w-12 hover:opacity-100 transition-all ${isLiked ? 'opacity-100 text-red-500' : ''}`}
              onClick={handleLike}
            >
              <Heart className="h-5 w-5" fill={isLiked ? "currentColor" : "none"} />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
