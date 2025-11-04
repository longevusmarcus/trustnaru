import { useEffect, useState } from "react";
import { Share2, RefreshCw, MapPin, Briefcase, Clock, DollarSign, Target, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

export const FutureYouPage = ({ careerPaths = [] }: { careerPaths?: any[] }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [paths, setPaths] = useState<any[]>(careerPaths);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  
  useEffect(() => {
    if (user && !hasLoaded) {
      loadCareerPaths();
      checkIfDemo();
    }
  }, [user, hasLoaded]);

  const checkIfDemo = async () => {
    if (!user) return;
    
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('wizard_data')
      .eq('user_id', user.id)
      .maybeSingle();
    
    // Show demo badge if user has no wizard data (hasn't completed wizard)
    setIsDemo(!profile?.wizard_data);
  };

  // Update paths when careerPaths prop changes (e.g., from wizard)
  useEffect(() => {
    if (careerPaths.length > 0) {
      setPaths(careerPaths);
      setHasLoaded(true);
    }
  }, [careerPaths]);

  const loadCareerPaths = async () => {
    if (!user) {
      setPaths([]);
      return;
    }

    setLoading(true);
    try {
      // Optimized query - only fetch essential fields first
      const { data, error } = await supabase
        .from('career_paths')
        .select('id, title, description, journey_duration, salary_range, image_url, category, user_feedback, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10); // Limit initial load

      if (!error && data) {
        setPaths(data);
        setHasLoaded(true);
      }
    } catch (error) {
      console.error('Error loading career paths:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNewVersions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get user profile data
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('wizard_data, cv_url, voice_transcription')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Call generate-career-paths function
      const { error } = await supabase.functions.invoke('generate-career-paths', {
        body: {
          wizardData: profile.wizard_data,
          cvUrl: profile.cv_url,
          voiceTranscription: profile.voice_transcription
        }
      });

      if (error) throw error;

      // Reload paths to include new ones
      await loadCareerPaths();
    } catch (error) {
      console.error('Error generating new versions:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleFeedback = async (pathId: string, feedback: 'up' | 'down') => {
    if (!user) return;
    
    // Optimistically update UI
    setPaths(paths.map(p => 
      p.id === pathId ? { ...p, user_feedback: feedback } : p
    ));
    
    try {
      const { error } = await supabase
        .from('career_paths')
        .update({ user_feedback: feedback })
        .eq('id', pathId)
        .eq('user_id', user.id);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error saving feedback:', error);
      // Revert on error
      setPaths(paths.map(p => 
        p.id === pathId ? { ...p, user_feedback: null } : p
      ));
    }
  };

  const futureCards = paths.length > 0 ? paths.map(path => ({
    id: path.id,
    title: path.title,
    location: "Remote / Hybrid",
    role: path.description,
    schedule: path.journey_duration,
    income: path.salary_range,
    image: path.image_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
    category: path.category,
    userFeedback: path.user_feedback
  })) : [];

  if (loading) {
    return (
      <div className="px-4 pb-24 pt-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Loading your personalized career paths...</p>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="h-64 w-full" />
                <CardContent className="p-6 space-y-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="max-w-md mx-auto space-y-6">

        <div className="flex flex-col gap-1 items-center justify-center text-xs text-muted-foreground">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleGenerateNewVersions}
            disabled={loading}
            className="h-auto py-1 px-2 text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            generate more versions (75% CV focus)
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleGenerateNewVersions}
            disabled={loading}
            className="h-auto py-1 px-2 text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            generate more versions (75% energy focus)
          </Button>
        </div>

        <div className="space-y-4">
          {futureCards.map((card, index) => (
            <Card key={index} className="overflow-hidden border-border/50">
              <div className="relative h-64 bg-gradient-to-br from-muted to-muted/50">
                <img 
                  src={card.image} 
                  alt={card.title}
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                
                {/* Demo Badge */}
                {isDemo && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-background/90 backdrop-blur-sm border border-border/50">
                    <span className="text-[10px] font-medium text-muted-foreground tracking-wider uppercase">demo</span>
                  </div>
                )}
                
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                </div>
              </div>
              
              <CardContent className="p-6 space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p className="line-clamp-3">{card.role}</p>
                </div>
                
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{card.schedule}</span>
                </div>

                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span>{card.income}</span>
                </div>
                
                {card.category && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {card.category}
                  </div>
                )}

                <div className="space-y-2 pt-4 border-t border-border/50">
                  <Button
                    variant="ghost" 
                    className="w-full justify-start" 
                    size="sm"
                    onClick={() => navigate(`/path/${index}`, { state: { card } })}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    View Path
                  </Button>
                  
                  <Button variant="ghost" className="w-full justify-start" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                  
                  {/* Feedback buttons */}
                  {card.id && (
                    <div className="flex gap-1 justify-end pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback(card.id, 'up')}
                        className={`h-auto p-1 ${card.userFeedback === 'up' ? 'text-primary' : 'text-muted-foreground/40'} hover:text-primary`}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback(card.id, 'down')}
                        className={`h-auto p-1 ${card.userFeedback === 'down' ? 'text-destructive' : 'text-muted-foreground/40'} hover:text-destructive`}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col gap-1 items-center justify-center text-xs text-muted-foreground">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleGenerateNewVersions}
            disabled={loading}
            className="h-auto py-1 px-2 text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            generate more versions (75% CV focus)
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleGenerateNewVersions}
            disabled={loading}
            className="h-auto py-1 px-2 text-xs"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            generate more versions (75% energy focus)
          </Button>
        </div>
      </div>
    </div>
  );
};
