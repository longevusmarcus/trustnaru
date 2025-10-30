import { Camera, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface PhotosStepProps {
  onNext: () => void;
  onBack: () => void;
}

export const PhotosStep = ({ onNext, onBack }: PhotosStepProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Show Your Best Self</h2>
        <p className="text-muted-foreground">
          Upload up to 10 photos that feel authentic to you
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card 
            key={i} 
            className="aspect-square border-2 border-dashed border-border hover:border-foreground/20 transition-colors cursor-pointer flex items-center justify-center"
          >
            <Plus className="h-8 w-8 text-muted-foreground" />
          </Card>
        ))}
      </div>

      <Card className="p-4 bg-muted/50 border-0">
        <div className="flex items-start gap-3">
          <Camera className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Tip</p>
            <p className="text-muted-foreground">
              Choose photos where you feel confident, energized, or in your element
            </p>
          </div>
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
