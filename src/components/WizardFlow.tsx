import { useState, useEffect } from "react";
import { UploadCVStep } from "./wizard/UploadCVStep";
import { PhotosStep } from "./wizard/PhotosStep";
import { VoiceStep } from "./wizard/VoiceStep";
import { ProcessingStep } from "./wizard/ProcessingStep";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useBadgeAwarding } from "@/hooks/useBadgeAwarding";
import { BadgeCelebration } from "@/components/BadgeCelebration";

interface WizardFlowProps {
  onComplete: (careerPaths: any[]) => void;
  onClose: () => void;
}

export const WizardFlow = ({ onComplete, onClose }: WizardFlowProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkAndAwardBadges, newlyAwardedBadge, clearCelebration } = useBadgeAwarding();
  const [step, setStep] = useState(1);
  const [cvUrl, setCvUrl] = useState<string | undefined>();
  const [voiceTranscription, setVoiceTranscription] = useState<string | undefined>();
  const [generatedPaths, setGeneratedPaths] = useState<any[]>([]);
  const [hasExistingData, setHasExistingData] = useState<{cv: boolean, photos: boolean, voice: boolean}>({
    cv: false,
    photos: false,
    voice: false
  });

  useEffect(() => {
    // Scroll to top when wizard opens
    window.scrollTo({ top: 0, behavior: "smooth" });
    
    const checkExistingData = async () => {
      if (!user) return;

      // Check for CV
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('cv_url, voice_transcription')
        .eq('user_id', user.id)
        .maybeSingle();

      // Check for photos
      const { data: photos } = await supabase
        .from('user_photos')
        .select('id')
        .eq('user_id', user.id);

      setHasExistingData({
        cv: !!profile?.cv_url,
        photos: (photos?.length || 0) >= 10,
        voice: !!profile?.voice_transcription
      });

      if (profile?.cv_url) setCvUrl(profile.cv_url);
      if (profile?.voice_transcription) {
        setVoiceTranscription(profile.voice_transcription);
      }
    };

    checkExistingData();
  }, [user]);

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

      // Check and award badges after paths are generated
      await checkAndAwardBadges();

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
              if (url) setCvUrl(url);
              setStep(2);
            }} 
            onSkip={() => setStep(2)}
            hasExistingCV={hasExistingData.cv}
          />
        )}
        {step === 2 && (
          <PhotosStep 
            onNext={() => setStep(3)} 
            onBack={() => setStep(1)}
            hasExistingPhotos={hasExistingData.photos}
          />
        )}
        {step === 3 && (
          <VoiceStep 
            onNext={(transcription) => {
              // Only update voice if user recorded a new one
              if (transcription && transcription !== "USE_EXISTING_VOICE") {
                setVoiceTranscription(transcription);
              }
              // If USE_EXISTING_VOICE, keep the existing voiceTranscription from state
              handleComplete();
            }} 
            onBack={() => setStep(2)}
            hasExistingVoice={hasExistingData.voice}
          />
        )}
        {step === 4 && <ProcessingStep />}
      </div>
      
      <BadgeCelebration badge={newlyAwardedBadge} onComplete={clearCelebration} />
    </div>
  );
};
