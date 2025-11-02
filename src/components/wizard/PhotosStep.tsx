import { Camera, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PhotosStepProps {
  onNext: () => void;
  onBack: () => void;
}

export const PhotosStep = ({ onNext, onBack }: PhotosStepProps) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Check total photos limit
    if (photos.length + files.length > 10) {
      toast({
        title: "Too many photos",
        description: "Please upload exactly 10 photos",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const previewUrls: string[] = [];

      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid file",
            description: `${file.name} is not an image`,
            variant: "destructive"
          });
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} is larger than 5MB`,
            variant: "destructive"
          });
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('user-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Save storage path in DB (safer than public URL)
        const { error: dbError } = await supabase
          .from('user_photos')
          .insert({
            user_id: user.id,
            photo_url: fileName,
            is_reference: true
          });

        if (dbError) throw dbError;

        // Local preview ensures user can see the photo even if bucket is private
        const preview = URL.createObjectURL(file);
        previewUrls.push(preview);
      }

      setPhotos([...photos, ...previewUrls]);
      toast({
        title: "Photos uploaded",
        description: `${previewUrls.length} photo(s) uploaded successfully`
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload photos. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Show Your Best Self</h2>
        <p className="text-muted-foreground">
          Upload exactly 10 photos — we'll use these to generate your personalized career images
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {photos.map((photo, i) => (
          <div key={i} className="relative aspect-square">
            <img src={photo} alt={`Upload ${i + 1}`} className="w-full h-full object-cover rounded-lg" />
            <button
              onClick={() => removePhoto(i)}
              className="absolute top-1 right-1 bg-background/80 rounded-full p-1 hover:bg-background"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        {photos.length < 10 && (
          <Card className="aspect-square border-2 border-dashed border-border hover:border-foreground/20 transition-colors cursor-pointer flex items-center justify-center">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
              id="photo-upload"
              disabled={uploading}
            />
            <label htmlFor="photo-upload" className="cursor-pointer w-full h-full flex items-center justify-center">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </label>
          </Card>
        )}
      </div>

      <Card className="p-4 bg-muted/50 border-0">
        <div className="flex items-start gap-3">
          <Camera className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-medium">Tip</p>
            <p className="text-muted-foreground">
              Upload clear photos of yourself. We'll use these to generate realistic images of you in your future career paths!
            </p>
          </div>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button onClick={onNext} disabled={photos.length !== 10 || uploading} className="flex-1">
          {uploading ? 'Uploading...' : photos.length !== 10 ? `Add ${10 - photos.length} more` : 'Continue'}
        </Button>
      </div>
    </div>
  );
};
