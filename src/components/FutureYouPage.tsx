import { useEffect, useState } from "react";
import { Share2, RefreshCw, MapPin, Briefcase, Clock, DollarSign, Target } from "lucide-react";
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
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    if (user && !hasLoaded) {
      loadCareerPaths();
    }
  }, [user, hasLoaded]);

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
      const { data, error } = await supabase
        .from('career_paths')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

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
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profile) return;

      // Call generate-career-paths function
      const { data: newPaths, error } = await supabase.functions.invoke('generate-career-paths', {
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
  
  const generateImages = async (pathId: string) => {
    if (generatingImages.has(pathId)) return;
    
    setGeneratingImages(prev => new Set(prev).add(pathId));
    
    try {
      const { error } = await supabase.functions.invoke('generate-path-images', {
        body: { pathId }
      });
      
      if (error) throw error;
      
      // Reload paths to get updated images
      await loadCareerPaths();
    } catch (error) {
      console.error('Error generating images:', error);
    } finally {
      setGeneratingImages(prev => {
        const next = new Set(prev);
        next.delete(pathId);
        return next;
      });
    }
  };

  useEffect(() => {
    // Auto-generate images for paths that don't have them (only once per path)
    if (paths.length === 0) return;
    
    paths.forEach(path => {
      if ((!path.all_images || path.all_images.length === 0) && !generatingImages.has(path.id)) {
        generateImages(path.id);
      }
    });
  }, [paths.map(p => p.id).join(',')]); // Only re-run if path IDs change

  const futureCards = paths.length > 0 ? paths.map(path => ({
    id: path.id,
    title: path.title,
    location: "Remote / Hybrid",
    role: path.description,
    schedule: path.journey_duration,
    income: path.salary_range,
    image: path.image_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
    pathImages: path.all_images || [],
    category: path.category,
    keySkills: path.key_skills || [],
    lifestyleBenefits: path.lifestyle_benefits || [],
    roadmap: path.roadmap || [],
    affirmations: path.affirmations || [],
    typicalDayRoutine: path.typical_day_routine || []
  })) : [
    {
      title: "Creative Strategist",
      location: "Milan & Lisbon",
      role: "Leading wellness ventures",
      schedule: "Works 4 days/week with deep purpose",
      income: "$100K per year",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop",
      pathImages: [
        "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=300&fit=crop"
      ],
      roadmap: [
        { step: "Master brand storytelling", duration: "3 months" },
        { step: "Launch wellness side project", duration: "6 months" },
        { step: "Build European network", duration: "12 months" },
        { step: "Transition to hybrid leadership role", duration: "18 months" }
      ],
      affirmations: [
        "You create work that makes people feel alive",
        "Your creativity flows when you trust your intuition",
        "Balance and purpose drive your success"
      ]
    },
    {
      title: "Tech Entrepreneur",
      location: "San Francisco",
      role: "Building AI-powered platforms",
      schedule: "Flexible remote work",
      income: "$150K per year",
      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop",
      pathImages: [
        "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop"
      ],
      roadmap: [
        { step: "Complete AI/ML certification", duration: "4 months" },
        { step: "Build MVP and get first users", duration: "8 months" },
        { step: "Raise seed funding", duration: "14 months" },
        { step: "Scale to 10K users", duration: "24 months" }
      ],
      affirmations: [
        "You solve problems that matter to millions",
        "Your technical vision shapes the future",
        "Innovation comes naturally when you stay curious"
      ]
    },
    {
      title: "Design Director",
      location: "Amsterdam",
      role: "Leading creative teams",
      schedule: "Hybrid work model",
      income: "$120K per year",
      image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=500&fit=crop",
      pathImages: [
        "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=300&fit=crop"
      ],
      roadmap: [
        { step: "Lead 3 major design projects", duration: "5 months" },
        { step: "Build and mentor design team", duration: "10 months" },
        { step: "Establish design system practice", duration: "16 months" },
        { step: "Secure director-level position", duration: "22 months" }
      ],
      affirmations: [
        "Your designs create experiences people love",
        "Leadership amplifies your creative impact",
        "You inspire teams to do their best work"
      ]
    }
  ];

  if (loading) {
    return (
      <div className="px-4 pb-24 pt-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">Your Future Selves</h1>
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
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Your Future Selves</h1>
          <p className="text-muted-foreground">7 possible versions of you in 2029</p>
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
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                </div>
              </div>
              
              <CardContent className="p-6 space-y-4">
                {/* Show 3 generated images if available */}
                {card.pathImages && card.pathImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {card.pathImages.slice(0, 3).map((imgUrl: string, idx: number) => (
                      <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-border/50">
                        <img 
                          src={imgUrl} 
                          alt={`${card.title} scene ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="text-sm text-muted-foreground">
                  <p className="line-clamp-3">{card.role}</p>
                </div>

                {/* Mini Roadmap - show first 2 steps */}
                {card.roadmap && card.roadmap.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-xs font-semibold text-foreground/80">Quick Roadmap:</h4>
                    {card.roadmap.slice(0, 2).map((step: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium mt-0.5">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-medium">{step.step}</span>
                          <span className="text-muted-foreground/70"> • {step.duration}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Affirmation - show first one */}
                {card.affirmations && card.affirmations.length > 0 && (
                  <div className="pt-2 border-t border-border/30">
                    <p className="text-xs italic text-muted-foreground/80">"{card.affirmations[0]}"</p>
                  </div>
                )}

                {/* Lifestyle Benefits - show first 2 */}
                {card.lifestyleBenefits && card.lifestyleBenefits.length > 0 && (
                  <div className="pt-3 space-y-2">
                    <h4 className="text-xs font-semibold text-foreground/80">Lifestyle:</h4>
                    {card.lifestyleBenefits.slice(0, 2).map((benefit: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                        <span>{benefit}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Daily Routine - show first 2 */}
                {card.typicalDayRoutine && card.typicalDayRoutine.length > 0 && (
                  <div className="pt-3 space-y-2">
                    <h4 className="text-xs font-semibold text-foreground/80">Daily Routine:</h4>
                    {card.typicalDayRoutine.slice(0, 2).map((activity: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                        <span>{activity}</span>
                      </div>
                    ))}
                  </div>
                )}
                
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button 
          variant="outline" 
          className="w-full" 
          size="lg"
          onClick={handleGenerateNewVersions}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Generate New Versions
        </Button>
      </div>
    </div>
  );
};
