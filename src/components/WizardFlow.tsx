import { useState } from "react";
import { UploadCVStep } from "./wizard/UploadCVStep";
import { PhotosStep } from "./wizard/PhotosStep";
import { VoiceStep } from "./wizard/VoiceStep";
import { ProcessingStep } from "./wizard/ProcessingStep";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

interface WizardFlowProps {
  onComplete: (careerPaths: any[]) => void;
  onClose: () => void;
}

export const WizardFlow = ({ onComplete, onClose }: WizardFlowProps) => {
  const [step, setStep] = useState(1);
  const [cvUrl, setCvUrl] = useState<string | undefined>();
  const [voiceTranscription, setVoiceTranscription] = useState<string | undefined>();
  const [generatedPaths, setGeneratedPaths] = useState<any[]>([]);
  const { toast } = useToast();

  const handleComplete = async () => {
    setStep(4);
    
    try {
      // Generate career paths
      const { data, error } = await supabase.functions.invoke('generate-career-paths', {
        body: {
          wizardData: {},
          cvUrl,
          voiceTranscription
        }
      });

      if (error) throw error;

      const paths = data.careerPaths || [];
      setGeneratedPaths(paths);

      // Generate images for each path in parallel
      const imagePromises = paths.map((path: any) =>
        supabase.functions.invoke('generate-path-images', {
          body: { pathId: path.id }
        }).catch(err => {
          console.error(`Failed to generate image for path ${path.id}:`, err);
          return null;
        })
      );

      await Promise.allSettled(imagePromises);

      // Fetch updated paths with images
      const { data: updatedPaths } = await supabase
        .from('career_paths')
        .select('*')
        .in('id', paths.map((p: any) => p.id));

      setTimeout(() => {
        onComplete(updatedPaths || paths);
      }, 2000);
    } catch (error) {
      console.error('Error generating paths:', error);
      toast({
        title: "Generation failed",
        description: "Failed to generate career paths. Please try again.",
        variant: "destructive"
      });
      setStep(3); // Go back to voice step
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="max-w-md mx-auto flex items-center justify-between h-14 px-4">
          <div className="flex-1">
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div 
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    i <= step ? 'bg-foreground' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="ml-4 h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-8">
        {step === 1 && (
          <UploadCVStep 
            onNext={(url) => {
              setCvUrl(url);
              setStep(2);
            }} 
            onSkip={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <PhotosStep 
            onNext={() => setStep(3)} 
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <VoiceStep 
            onNext={(transcription) => {
              setVoiceTranscription(transcription);
              handleComplete();
            }} 
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && <ProcessingStep />}
      </div>
    </div>
  );
};
