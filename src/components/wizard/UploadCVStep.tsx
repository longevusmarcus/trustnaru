import { Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface UploadCVStepProps {
  onNext: () => void;
  onSkip: () => void;
}

export const UploadCVStep = ({ onNext, onSkip }: UploadCVStepProps) => {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Share Your Experience</h2>
        <p className="text-muted-foreground">
          Upload your CV or import from LinkedIn
        </p>
      </div>

      <div className="space-y-4">
        <Card className="p-8 border-2 border-dashed border-border hover:border-foreground/20 transition-colors cursor-pointer">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="font-medium">Drop your CV here</p>
              <p className="text-sm text-muted-foreground">PDF, DOC, or DOCX</p>
            </div>
            <Button variant="outline" size="sm">Choose File</Button>
          </div>
        </Card>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" size="lg">
          <FileText className="h-4 w-4 mr-2" />
          Import from LinkedIn
        </Button>
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="ghost" onClick={onSkip} className="flex-1">
          Skip for now
        </Button>
        <Button onClick={onNext} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
};
