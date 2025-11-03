import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Building, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Mentor {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  company_url: string | null;
  location: string | null;
  headline: string | null;
  experience_years: number | null;
  key_skills: string[] | null;
  industry: string | null;
  profile_url: string | null;
  profile_image_url: string | null;
  follower_count: string | null;
  category: string | null;
}

export const MentorsPage = () => {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    try {
      const { data, error } = await supabase
        .from("mentors")
        .select("*")
        .order("name");

      if (error) throw error;
      setMentors(data || []);
    } catch (error) {
      console.error("Error fetching mentors:", error);
      toast({
        title: "Error loading mentors",
        description: "Failed to load mentor data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(
    new Set(mentors.map((m) => m.category).filter(Boolean))
  );

  const filteredMentors =
    filter === "all"
      ? mentors
      : mentors.filter((m) => m.category === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading mentors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold mb-4">Connect with Mentors</h1>
          
          {/* Filter Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
              className="rounded-full"
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={filter === category ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(category || "all")}
                className="rounded-full whitespace-nowrap"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        {filteredMentors.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No mentors found</p>
          </div>
        ) : (
          filteredMentors.map((mentor) => (
            <Card key={mentor.id} className="p-4">
              <div className="flex gap-4">
                <Avatar className="h-16 w-16 flex-shrink-0">
                  <AvatarImage src={mentor.profile_image_url || undefined} />
                  <AvatarFallback>
                    {mentor.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg leading-tight mb-1">
                    {mentor.name}
                  </h3>
                  
                  {mentor.title && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {mentor.title}
                    </p>
                  )}

                  <div className="space-y-2 mb-3">
                    {mentor.company && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building className="h-3 w-3" />
                        <span className="line-clamp-1">{mentor.company}</span>
                      </div>
                    )}
                    
                    {mentor.location && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="line-clamp-1">{mentor.location}</span>
                      </div>
                    )}
                    
                    {mentor.follower_count && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span>{mentor.follower_count} followers</span>
                      </div>
                    )}
                  </div>

                  {mentor.key_skills && mentor.key_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {mentor.key_skills.slice(0, 3).map((skill, idx) => (
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
                      onClick={() => window.open(mentor.profile_url!, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View LinkedIn Profile
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
