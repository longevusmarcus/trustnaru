import { Dialog, DialogContent, DialogDescription } from "@/components/ui/dialog";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRef, useState, useEffect } from "react";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DailyMotivationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathTitle?: string;
}

export const DailyMotivation = ({ open, onOpenChange, pathTitle }: DailyMotivationProps) => {
  const [motivation, setMotivation] = useState("Today is a great day to keep moving forward.");
  const { toast } = useToast();
  const { user } = useAuth();
  const contentRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchPersonalizedMotivation();
    }
  }, [open]);

  const fetchPersonalizedMotivation = async () => {
    if (!user) {
      console.log('No user authenticated, skipping motivation fetch');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Get the current session to ensure we have a valid token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('No active session');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-daily-motivation', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });
      
      if (error) throw error;
      
      if (data?.motivation) {
        setMotivation(data.motivation);
      }
    } catch (error) {
      console.error('Error fetching motivation:', error);
      toast({
        title: "Unable to load motivation",
        description: "Using a default message instead.",
        variant: "default",
      });
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


  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-full h-screen border-none p-0 flex items-center justify-center bg-background/95 backdrop-blur-sm pointer-events-auto" 
        aria-describedby="motivation-description"
        onEscapeKeyDown={handleClose}
        onPointerDownOutside={handleClose}
        onInteractOutside={handleClose}
      >
        <span className="sr-only">Daily motivation</span>
        <DialogDescription id="motivation-description" className="sr-only">Daily motivation message</DialogDescription>
        <div ref={contentRef} className="flex flex-col items-center justify-center px-8 py-16 max-w-2xl mx-auto space-y-16 pointer-events-auto">
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
              className="text-xs opacity-40 hover:opacity-100 transition-opacity pointer-events-auto touch-manipulation min-h-[44px] relative z-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleClose();
              }}
              type="button"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
