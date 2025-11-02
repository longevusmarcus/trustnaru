import { Upload, FileText, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState, useRef } from "react";
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
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) await uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const uploadFile = async (file: File) => {
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

      const { error: uploadError } = await supabase.storage
        .from('cvs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store storage path (private bucket)
      setUploadedFile(file.name);
      setCvUrl(fileName);

      // Save to user profile immediately
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({ user_id: user.id, cv_url: fileName }, { onConflict: 'user_id' });
      if (profileError) throw profileError;

      toast({
        title: "CV uploaded successfully",
        description: "Your CV has been uploaded and will be analyzed"
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload your CV",
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
        <Card 
          className={`p-8 border-2 border-dashed transition-colors cursor-pointer ${
            uploadedFile ? 'border-primary bg-primary/5' : 'border-border hover:border-foreground/20'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
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
              <div className="text-center px-4">
                {uploadedFile ? (
                  <>
                    <p className="font-medium text-primary break-all">✓ {uploadedFile}</p>
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
                <Button variant="outline" size="sm" type="button" disabled={uploading}
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                >
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
        <Button onClick={() => onNext(cvUrl || undefined)} className="flex-1" disabled={!cvUrl || uploading}>
          {cvUrl ? 'Continue' : 'Upload CV to continue'}
        </Button>
      </div>
    </div>
  );
};
