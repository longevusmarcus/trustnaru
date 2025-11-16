import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, MapPin, Building, Users, Search, Loader2, Briefcase, GraduationCap, Trophy, Clock, Lightbulb, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import useEmblaCarousel from 'embla-carousel-react';
import { CloneButton } from "@/components/CloneButton";
import { useAuth } from "@/hooks/useAuth";

interface MentorsPageProps {
  onScrollChange?: (isScrolling: boolean) => void;
}

export const MentorsPage = ({ onScrollChange }: MentorsPageProps) => {
  const [mentors, setMentors] = useState<any[]>([]);
  const [filteredMentors, setFilteredMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [personalizedMentors, setPersonalizedMentors] = useState<any[]>([]);
  const [loadingPersonalized, setLoadingPersonalized] = useState(false);
  const [happenstanceResults, setHappenstanceResults] = useState<any[]>([]);
  const [loadingHappenstance, setLoadingHappenstance] = useState(false);
  const [happenstanceQuery, setHappenstanceQuery] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();
  const [emblaRef] = useEmblaCarousel({ loop: false, align: 'start' });
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleCardScroll = () => {
    if (onScrollChange) {
      onScrollChange(true);
      
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      
      const timeout = setTimeout(() => {
        onScrollChange(false);
      }, 3000);
      
      setScrollTimeout(timeout);
    }
  };

  useEffect(() => {
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [scrollTimeout]);

  const categories = ["Business", "Technology", "Design", "Marketing", "Finance", "Healthcare"];

  useEffect(() => {
    loadMentors();
    loadPersonalizedMentorsFromCache();
  }, [user]);

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

  const loadPersonalizedMentorsFromCache = () => {
    if (!user?.id) return;
    
    try {
      const cacheKey = `personalized_mentors_${user.id}`;
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();
        const cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours
        
        if (now - timestamp < cacheExpiry) {
          setPersonalizedMentors(data);
        } else {
          localStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.error('Error loading cached mentors:', error);
    }
  };

  const loadPersonalizedMentors = async (focus: 'energy' | 'cv' | 'balanced' = 'balanced') => {
    setLoadingPersonalized(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-personalized-mentors', {
        body: { focus }
      });
      
      if (error) throw error;
      
      if (data?.mentors) {
        setPersonalizedMentors(data.mentors);
        
        // Save to localStorage
        if (user?.id) {
          const cacheKey = `personalized_mentors_${user.id}`;
          localStorage.setItem(cacheKey, JSON.stringify({
            data: data.mentors,
            timestamp: Date.now()
          }));
        }
      }
    } catch (error) {
      console.error('Error loading personalized mentors:', error);
      toast({
        title: "Error",
        description: "Failed to load personalized recommendations.",
        variant: "destructive"
      });
    } finally {
      setLoadingPersonalized(false);
    }
  };

  const searchHappenstance = async () => {
    if (!happenstanceQuery.trim()) {
      toast({
        title: "Enter a question",
        description: "Ask who you should meet, e.g., 'Who can help me build a tech startup in Europe?'",
        variant: "destructive"
      });
      return;
    }

    setLoadingHappenstance(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const { data, error } = await supabase.functions.invoke('happenstance-search', {
        body: { 
          search_intent: happenstanceQuery,
          max_results: 5
        },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      
      if (error) throw error;
      
      if (data?.results) {
        setHappenstanceResults(data.results);
        // Clear personalized mentors when showing happenstance results
        setPersonalizedMentors([]);
        
        toast({
          title: "Found matches!",
          description: `Discovered ${data.results.length} people who can help with your path.`,
        });
      }
    } catch (error) {
      console.error('Error in happenstance search:', error);
      toast({
        title: "Search failed",
        description: "Unable to search right now. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoadingHappenstance(false);
    }
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
    <div className="px-4 pb-24 pt-4 max-w-md mx-auto">
      <Tabs defaultValue="featured" className="w-full">
        <TabsList className="w-full mb-4 h-9">
          <TabsTrigger value="featured" className="flex-1 text-xs">Featured</TabsTrigger>
          <TabsTrigger value="foryou" className="flex-1 text-xs">For You</TabsTrigger>
        </TabsList>

        <TabsContent value="featured" className="mt-0">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search journeys by name, title, or company..."
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
              {filteredMentors.length} featured {filteredMentors.length === 1 ? 'journey' : 'journeys'}
            </p>
          </div>

      {/* Mentor Cards */}
      <div className="space-y-4">
        {filteredMentors.map((mentor) => (
          <Card key={mentor.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardContent 
              className="p-4 overflow-y-auto max-h-[55vh]"
              onScroll={handleCardScroll}
            >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-4">
                    <Avatar className="h-12 w-12 bg-primary/10 flex-shrink-0">
                      <AvatarFallback className="text-base font-semibold bg-primary/10 text-foreground">
                        {mentor.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base mb-0.5">{mentor.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">{mentor.title}</p>
                    </div>
                  </div>

                  {/* Basic Info */}
                  {mentor.company && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                      <Building className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{mentor.company}</span>
                    </div>
                  )}

                  {mentor.location && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{mentor.location}</span>
                    </div>
                  )}

                  {mentor.follower_count && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Users className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{mentor.follower_count} followers</span>
                    </div>
                  )}

                  {/* Skills */}
                  {mentor.key_skills && mentor.key_skills.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5" />
                        Key Skills
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {mentor.key_skills.slice(0, 6).map((skill: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-[10px] px-2 py-0.5">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Career Path */}
                  {mentor.career_path && mentor.career_path.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                        <Briefcase className="h-3.5 w-3.5" />
                        Career Journey
                      </h4>
                      <div className="space-y-2">
                        {mentor.career_path.slice(0, 3).map((job: any, idx: number) => (
                          <div key={idx} className="border-l-2 border-primary/30 pl-3 py-0.5">
                            <p className="text-xs font-medium">{job.title}</p>
                            <p className="text-[10px] text-muted-foreground">{job.company}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {mentor.education && mentor.education.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                        <GraduationCap className="h-3.5 w-3.5" />
                        Education
                      </h4>
                      <div className="space-y-1.5">
                        {mentor.education.slice(0, 2).map((edu: any, idx: number) => (
                          <div key={idx} className="text-xs">
                            <p className="font-medium">{edu.school}</p>
                            <p className="text-[10px] text-muted-foreground">{edu.degree}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Achievements */}
                  {mentor.achievements && mentor.achievements.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                        <Trophy className="h-3.5 w-3.5" />
                        Achievements
                      </h4>
                      <ul className="space-y-1">
                        {mentor.achievements.slice(0, 3).map((achievement: string, idx: number) => (
                          <li key={idx} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{achievement}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Typical Day */}
                  {mentor.typical_day_routine && mentor.typical_day_routine.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Typical Day
                      </h4>
                      <ul className="space-y-1">
                        {mentor.typical_day_routine.slice(0, 3).map((activity: string, idx: number) => (
                          <li key={idx} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{activity}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Leadership Philosophy */}
                  {mentor.leadership_philosophy && mentor.leadership_philosophy.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5" />
                        Leadership
                      </h4>
                      <ul className="space-y-1">
                        {mentor.leadership_philosophy.slice(0, 2).map((philosophy: string, idx: number) => (
                          <li key={idx} className="text-[10px] text-muted-foreground italic border-l-2 border-primary/20 pl-2 py-0.5">
                            {philosophy}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Clone Profile Button */}
                  <CloneButton mentorId={mentor.id} />
                </CardContent>
              </Card>
        ))}
      </div>

          {filteredMentors.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No journeys found matching your criteria.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="foryou" className="mt-0">
          {/* Happenstance Search */}
          <div className="mb-6 space-y-3">
            <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Who should you meet?
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                Ask a natural language question about who can help with your career path
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., Who can help me build a longevity startup in Europe?"
                  value={happenstanceQuery}
                  onChange={(e) => setHappenstanceQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchHappenstance()}
                  className="flex-1"
                  disabled={loadingHappenstance}
                />
                <Button 
                  onClick={searchHappenstance}
                  disabled={loadingHappenstance}
                  size="sm"
                >
                  {loadingHappenstance ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Quick example queries */}
            {!happenstanceResults.length && !personalizedMentors.length && !loadingHappenstance && !loadingPersonalized && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "Who can help me raise funding?",
                    "Find mentors in AI and sustainability",
                    "Who should I talk to about career transitions?"
                  ].map((example, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        setHappenstanceQuery(example);
                      }}
                    >
                      {example}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Happenstance Results */}
          {loadingHappenstance && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Finding the perfect matches for your path...</p>
              </div>
            </div>
          )}

          {happenstanceResults.length > 0 && (
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Matches for your path</h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setHappenstanceResults([]);
                    setHappenstanceQuery("");
                  }}
                  className="text-xs h-7"
                >
                  Clear
                </Button>
              </div>
              {happenstanceResults.map((result, idx) => (
                <Card key={idx} className="overflow-hidden hover:shadow-lg transition-shadow border-primary/20">
                  <CardContent className="p-4">
                    {/* Mentor Info */}
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="h-12 w-12 flex-shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {result.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base mb-0.5">{result.name}</h3>
                        <p className="text-xs text-muted-foreground mb-1">{result.title}</p>
                        {result.company && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Building className="h-3 w-3" />
                            <span>{result.company}</span>
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {Math.round(result.relevance_score * 100)}% match
                      </Badge>
                    </div>

                    {/* AI Explanation */}
                    {result.explanation && (
                      <div className="mb-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
                        <h4 className="text-xs font-semibold mb-1 flex items-center gap-1">
                          <Lightbulb className="h-3 w-3 text-primary" />
                          Why this match?
                        </h4>
                        <p className="text-xs text-muted-foreground">{result.explanation}</p>
                      </div>
                    )}

                    {/* Key Synergies */}
                    {result.key_synergies && result.key_synergies.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold mb-1.5">Key Synergies</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {result.key_synergies.map((synergy: string, synIdx: number) => (
                            <Badge key={synIdx} variant="outline" className="text-[10px] px-2 py-0.5">
                              {synergy}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Conversation Starters */}
                    {result.conversation_starters && result.conversation_starters.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          How to start the conversation
                        </h4>
                        <ul className="space-y-1">
                          {result.conversation_starters.map((starter: string, startIdx: number) => (
                            <li key={startIdx} className="text-[10px] text-muted-foreground flex items-start gap-1.5">
                              <span className="text-primary mt-0.5">•</span>
                              <span>"{starter}"</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Location & Industry */}
                    <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground mb-3">
                      {result.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{result.location}</span>
                        </div>
                      )}
                      {result.industry && (
                        <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                          {result.industry}
                        </Badge>
                      )}
                    </div>

                    {/* Action Button */}
                    {result.profile_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-xs h-8"
                        onClick={() => window.open(result.profile_url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1.5" />
                        View Profile
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Original Personalized Mentors Section */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-4">
              Or get personalized recommendations based on your profile
            </p>
            {personalizedMentors.length === 0 && !loadingPersonalized && !happenstanceResults.length && (
              <Button onClick={() => loadPersonalizedMentors()} className="w-full">
                Generate Recommendations
              </Button>
            )}
            {personalizedMentors.length > 0 && !loadingPersonalized && (
              <div className="flex gap-2 mb-4">
                <Button 
                  onClick={() => loadPersonalizedMentors('energy')} 
                  variant="outline" 
                  size="sm"
                  className="flex-1 text-xs h-8"
                >
                  + Energy Focus
                </Button>
                <Button 
                  onClick={() => loadPersonalizedMentors('cv')} 
                  variant="outline" 
                  size="sm"
                  className="flex-1 text-xs h-8"
                >
                  + CV Focus
                </Button>
              </div>
            )}
          </div>

          {loadingPersonalized && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Finding people who match your aspirations...</p>
              </div>
            </div>
          )}

          {personalizedMentors.length > 0 && (
            <div className="space-y-4">
              {personalizedMentors.map((mentor, idx) => (
                <Card key={idx} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="mb-3">
                      <h3 className="font-semibold text-base mb-1">{mentor.name}</h3>
                      <p className="text-xs text-muted-foreground mb-0.5">{mentor.title}</p>
                      {mentor.company && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Building className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{mentor.company}</span>
                        </div>
                      )}
                    </div>

                    {mentor.description && (
                      <p className="text-xs text-muted-foreground mb-3">{mentor.description}</p>
                    )}

                    {mentor.tags && mentor.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {mentor.tags.map((tag: string, tagIdx: number) => (
                          <Badge key={tagIdx} variant="secondary" className="text-[10px] px-2 py-0.5">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {mentor.career_journey && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5" />
                          Career Journey
                        </h4>
                        <p className="text-[10px] text-muted-foreground">{mentor.career_journey}</p>
                      </div>
                    )}

                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
