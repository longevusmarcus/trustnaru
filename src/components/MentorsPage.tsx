import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, MapPin, Building, Users, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const MentorsPage = () => {
  const [mentors, setMentors] = useState<any[]>([]);
  const [filteredMentors, setFilteredMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { toast } = useToast();

  const categories = ["Business", "Technology", "Design", "Marketing", "Finance", "Healthcare"];

  useEffect(() => {
    loadMentors();
  }, []);

  useEffect(() => {
    filterMentors();
  }, [searchQuery, selectedCategory, mentors]);

  const loadMentors = async () => {
    try {
      const { data, error } = await supabase
        .from('mentors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        // Auto-import if no mentors exist
        await importMentorsFromCSV();
      } else {
        setMentors(data);
        setFilteredMentors(data);
      }
    } catch (error) {
      console.error('Error loading mentors:', error);
      toast({
        title: "Error loading mentors",
        description: "Failed to load mentor profiles.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const importMentorsFromCSV = async () => {
    setImporting(true);
    try {
      const response = await fetch('/data/mentors.csv');
      const csvText = await response.text();
      
      const lines = csvText.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"(.*)"$/, '$1'));
      
      // Valid columns in the mentors table
      const validColumns = [
        'name', 'title', 'company', 'company_url', 'location', 'headline',
        'experience_years', 'key_skills', 'education', 'achievements',
        'career_path', 'industry', 'profile_url', 'profile_image_url',
        'follower_count', 'category', 'visualization_images',
        'typical_day_routine', 'leadership_philosophy'
      ];
      
      const mentorsToInsert = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const values = parseCSVLine(lines[i]);
        if (values.length < headers.length) continue;
        
        const mentor: any = {};
        headers.forEach((header, index) => {
          // Skip columns that don't exist in the database
          if (!validColumns.includes(header)) return;
          
          let value = values[index];
          
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          }
          
          if (['key_skills', 'achievements', 'visualization_images', 'typical_day_routine', 'leadership_philosophy'].includes(header)) {
            try {
              mentor[header] = JSON.parse(value);
            } catch {
              mentor[header] = [];
            }
          } else if (['education', 'career_path'].includes(header)) {
            try {
              mentor[header] = JSON.parse(value);
            } catch {
              mentor[header] = [];
            }
          } else if (header === 'experience_years') {
            mentor[header] = parseInt(value) || 0;
          } else {
            mentor[header] = value || null;
          }
        });
        
        // Only add if mentor has a name
        if (mentor.name) {
          mentorsToInsert.push(mentor);
        }
      }
      
      if (mentorsToInsert.length > 0) {
        const { error } = await supabase
          .from('mentors')
          .upsert(mentorsToInsert, { onConflict: 'name' });
        
        if (error) throw error;
        
        toast({
          title: "Success!",
          description: `Imported ${mentorsToInsert.length} mentors successfully.`,
        });
        
        await loadMentors();
      }
    } catch (error) {
      console.error('Error importing mentors:', error);
      toast({
        title: "Import failed",
        description: "Failed to import mentors from CSV.",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
    }
  };

  const parseCSVLine = (line: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const filterMentors = () => {
    let filtered = mentors;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(mentor => 
        mentor.name?.toLowerCase().includes(query) ||
        mentor.title?.toLowerCase().includes(query) ||
        mentor.company?.toLowerCase().includes(query) ||
        mentor.headline?.toLowerCase().includes(query)
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(mentor => mentor.category === selectedCategory);
    }
    
    setFilteredMentors(filtered);
  };

  if (loading || importing) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">
            {importing ? "Importing mentors..." : "Loading mentors..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-4 max-w-4xl mx-auto">
      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search mentors by name, title, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
        >
          All
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Results Count */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground">
          {filteredMentors.length} {filteredMentors.length === 1 ? 'mentor' : 'mentors'} found
        </p>
      </div>

      {/* Mentor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMentors.map((mentor) => (
          <Card key={mentor.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="h-16 w-16 bg-primary/10">
                  <AvatarFallback className="text-lg font-semibold bg-primary/10 text-foreground">
                    {mentor.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">{mentor.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{mentor.title}</p>
                </div>
              </div>

              {mentor.company && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Building className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{mentor.company}</span>
                </div>
              )}

              {mentor.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{mentor.location}</span>
                </div>
              )}

              {mentor.follower_count && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Users className="h-4 w-4 flex-shrink-0" />
                  <span>{mentor.follower_count} followers</span>
                </div>
              )}

              {mentor.key_skills && mentor.key_skills.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {mentor.key_skills.slice(0, 3).map((skill: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}

              {mentor.profile_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => window.open(mentor.profile_url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View LinkedIn Profile
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMentors.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No mentors found matching your criteria.</p>
        </div>
      )}
    </div>
  );
};
