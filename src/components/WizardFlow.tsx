import { useState } from "react";
import { UploadCVStep } from "./wizard/UploadCVStep";
import { PhotosStep } from "./wizard/PhotosStep";
import { VoiceStep } from "./wizard/VoiceStep";
import { ProcessingStep } from "./wizard/ProcessingStep";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WizardFlowProps {
  onComplete: () => void;
  onClose: () => void;
}

export const WizardFlow = ({ onComplete, onClose }: WizardFlowProps) => {
  const [step, setStep] = useState(1);

  const handleComplete = () => {
    setStep(4);
    setTimeout(() => {
      onComplete();
    }, 4000);
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
            onNext={() => setStep(2)} 
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
            onNext={handleComplete} 
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && <ProcessingStep />}
      </div>
    </div>
  );
};
