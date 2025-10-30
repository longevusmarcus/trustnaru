import { Mic, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface VoiceStepProps {
  onNext: () => void;
  onBack: () => void;
}

export const VoiceStep = ({ onNext, onBack }: VoiceStepProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Share Your Energy</h2>
        <p className="text-muted-foreground">
          Record 15-30 seconds about what gives you energy lately
        </p>
      </div>

      <Card className="p-12 flex flex-col items-center space-y-6">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-foreground/10 to-foreground/5 flex items-center justify-center">
          <Mic className="h-16 w-16 text-foreground/60" />
        </div>

        <div className="text-center space-y-2">
          <p className="font-medium">Tap to record</p>
          <p className="text-sm text-muted-foreground">
            Speak naturally about what excites and energizes you
          </p>
        </div>

        <Button size="lg" className="rounded-full w-20 h-20">
          <Circle className="h-8 w-8" />
        </Button>
      </Card>

      <Card className="p-4 bg-muted/50 border-0">
        <div className="text-sm space-y-1">
          <p className="font-medium">Example prompts:</p>
          <ul className="text-muted-foreground space-y-1 ml-4">
            <li>• What activities make you lose track of time?</li>
            <li>• What kind of problems do you love solving?</li>
            <li>• What brings you joy and fulfillment?</li>
          </ul>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
};
