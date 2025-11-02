import { Upload, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UploadCVStepProps {
  onNext: (cvUrl?: string) => void;
  onSkip: () => void;
}

export const UploadCVStep = ({ onNext, onSkip }: UploadCVStepProps) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, DOC, or DOCX file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('cvs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('cvs')
        .getPublicUrl(fileName);

      setUploadedFile(file.name);
      setCvUrl(publicUrl);
      toast({
        title: "CV uploaded successfully",
        description: "Your CV has been uploaded and will be analyzed"
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload your CV. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Share Your Experience</h2>
        <p className="text-muted-foreground">
          Upload your CV to help us create personalized paths
        </p>
      </div>

      <div className="space-y-4">
        <Card className={`p-8 border-2 border-dashed transition-colors ${
          uploadedFile ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/20 cursor-pointer'
        }`}>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
            id="cv-upload"
            disabled={uploading}
          />
          <label htmlFor="cv-upload" className="cursor-pointer">
            <div className="flex flex-col items-center space-y-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                uploadedFile ? 'bg-primary' : 'bg-muted'
              }`}>
                {uploadedFile ? (
                  <Check className="h-8 w-8 text-primary-foreground" />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="text-center">
                {uploadedFile ? (
                  <>
                    <p className="font-medium text-primary">✓ {uploadedFile}</p>
                    <p className="text-sm text-muted-foreground">Click to change</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">{uploading ? 'Uploading...' : 'Drop your CV here'}</p>
                    <p className="text-sm text-muted-foreground">PDF, DOC, or DOCX (max 10MB)</p>
                  </>
                )}
              </div>
              {!uploadedFile && (
                <Button variant="outline" size="sm" type="button" disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Choose File'}
                </Button>
              )}
            </div>
          </label>
        </Card>
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="ghost" onClick={onSkip} className="flex-1">
          Skip for now
        </Button>
        <Button onClick={() => onNext(cvUrl || undefined)} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
};
