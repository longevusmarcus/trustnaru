import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, CheckCircle } from "lucide-react";

export const ImportMentorsUtil = () => {
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const { toast } = useToast();

  const importMentorsFromCSV = async () => {
    setImporting(true);
    try {
      // Fetch the CSV file
      const response = await fetch('/data/mentors.csv');
      const csvText = await response.text();
      
      // Parse CSV
      const lines = csvText.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      const mentors = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Handle CSV with quoted fields that may contain commas
        const values: string[] = [];
        let currentValue = '';
        let inQuotes = false;
        
        for (let j = 0; j < lines[i].length; j++) {
          const char = lines[i][j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim());
        
        // Parse JSON fields
        const parseJsonField = (value: string) => {
          try {
            value = value.replace(/^"|"$/g, '');
            return value.startsWith('[') || value.startsWith('{') ? JSON.parse(value) : value;
          } catch {
            return value;
          }
        };
        
        const mentor: any = {};
        headers.forEach((header, index) => {
          const value = values[index]?.replace(/^"|"$/g, '') || null;
          
          if (header === 'experience_years') {
            mentor[header] = value ? parseInt(value) : null;
          } else if (['key_skills', 'achievements', 'visualization_images', 'typical_day_routine', 'leadership_philosophy'].includes(header)) {
            mentor[header] = value ? parseJsonField(value) : [];
          } else if (['education', 'career_path'].includes(header)) {
            mentor[header] = value ? parseJsonField(value) : [];
          } else if (['id', 'created_date', 'updated_date', 'created_by_id', 'created_by', 'is_sample', 'is_personalized', 'last_scraped_date'].includes(header)) {
            // Skip these fields
          } else {
            mentor[header] = value || null;
          }
        });
        
        mentors.push(mentor);
      }
      
      // Insert into database in batches
      const batchSize = 10;
      for (let i = 0; i < mentors.length; i += batchSize) {
        const batch = mentors.slice(i, i + batchSize);
        const { error } = await supabase
          .from('mentors')
          .upsert(batch, { onConflict: 'name', ignoreDuplicates: false });
        
        if (error) throw error;
      }
      
      setImported(true);
      toast({
        title: "Import successful!",
        description: `Successfully imported ${mentors.length} mentors`,
      });
    } catch (error) {
      console.error('Error importing mentors:', error);
      toast({
        title: "Import failed",
        description: "Failed to import mentor data. Check console for details.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="p-6 m-4">
      <h2 className="text-lg font-semibold mb-4">Import Mentors Data</h2>
      <p className="text-sm text-muted-foreground mb-4">
        This will import mentor data from the CSV file into the database.
      </p>
      <Button 
        onClick={importMentorsFromCSV} 
        disabled={importing || imported}
        className="w-full"
      >
        {importing ? (
          <>Importing...</>
        ) : imported ? (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Imported Successfully
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Import Mentors from CSV
          </>
        )}
      </Button>
    </Card>
  );
};
