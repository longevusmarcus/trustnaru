import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRef, useState, useEffect } from "react";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";

interface DailyMotivationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathTitle?: string;
}

export const DailyMotivation = ({ open, onOpenChange, pathTitle }: DailyMotivationProps) => {
  const [motivation, setMotivation] = useState("Today is a great day to keep moving forward.");
  const { toast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchPersonalizedMotivation();
    }
  }, [open]);

  const fetchPersonalizedMotivation = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('generate-daily-motivation');
      
      if (error) throw error;
      
      if (data?.motivation) {
        setMotivation(data.motivation);
      }
    } catch (error) {
      console.error('Error fetching motivation:', error);
    } finally {
      setIsLoading(false);
    }
  };

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


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-screen border-none p-0 flex items-center justify-center bg-background/95 backdrop-blur-sm">
        <div ref={contentRef} className="flex flex-col items-center justify-center px-8 py-16 max-w-2xl mx-auto space-y-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-center leading-tight tracking-tight">
            {isLoading ? "..." : motivation}
          </h1>

          <div className="flex flex-col items-center gap-6">
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
              className="text-xs opacity-40 hover:opacity-100 transition-opacity"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
