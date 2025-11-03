import { ChevronRight, Target, BookOpen, Compass, Flame, Award, Lightbulb, X, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const getWeekDates = () => {
  const today = new Date();
  const currentDay = today.getDay();
  const diff = currentDay === 0 ? -6 : 1 - currentDay; // Adjust so Monday is first
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
};

const dailyMissions = [
  {
    icon: Target,
    title: "Define Your Core Values",
    description: "Reflect on what truly matters to you",
    duration: "10 min",
    type: "Reflection"
  },
  {
    icon: BookOpen,
    title: "Document Your Progress",
    description: "Record one achievement from today",
    duration: "5 min",
    type: "Journaling"
  },
  {
    icon: Compass,
    title: "Visualize Your Path",
    description: "Spend time imagining your ideal future",
    duration: "15 min",
    type: "Meditation"
  }
];

const featuredTopics = [
  { title: "Design Your Future", description: "A guided pathway to visualize and plan your ideal future self" },
  { title: "Build Your Network", description: "Strategic approaches to connect with the right people" },
  { title: "Master Your Craft", description: "Daily practices to develop expertise in your field" },
  { title: "Find Your Voice", description: "Discover and communicate your unique value proposition" },
  { title: "Create Impact", description: "Transform your work into meaningful contributions" },
  { title: "Stay Resilient", description: "Build mental strength for your career journey" },
  { title: "Embrace Change", description: "Navigate transitions with confidence and clarity" },
];

const getDailyFeaturedTopic = () => {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  return featuredTopics[dayOfYear % featuredTopics.length];
};


export const HomePage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<any>(null);
  const [streaks, setStreaks] = useState<Date[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<any[]>([]);
  const [firstPath, setFirstPath] = useState<any>(null);
  const [featuredDialogOpen, setFeaturedDialogOpen] = useState(false);
  const [featuredContent, setFeaturedContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');
  const weekDates = getWeekDates();
  const dailyTopic = getDailyFeaturedTopic();

  useEffect(() => {
    const fetchGamificationData = async () => {
      if (!user) return;

      const weekStart = weekDates[0].toISOString().split('T')[0];
      const weekEnd = weekDates[6].toISOString().split('T')[0];

      // Fetch all data in parallel
      const [statsResult, streakResult, badgesResult, pathsResult, profileResult] = await Promise.all([
        supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('daily_streaks')
          .select('streak_date')
          .eq('user_id', user.id)
          .eq('completed', true)
          .gte('streak_date', weekStart)
          .lte('streak_date', weekEnd),
        supabase
          .from('user_badges')
          .select('*, badges (name, icon, description)')
          .eq('user_id', user.id)
          .order('earned_at', { ascending: false })
          .limit(3),
        supabase
          .from('career_paths')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('user_profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle()
      ]);

      if (!statsResult.data) {
        await supabase.from('user_stats').insert({
          user_id: user.id,
          current_streak: 0,
          longest_streak: 0,
          total_points: 0
        });
      } else {
        setUserStats(statsResult.data);
      }

      if (streakResult.data) {
        setStreaks(streakResult.data.map(s => new Date(s.streak_date)));
      }

      if (badgesResult.data) {
        setEarnedBadges(badgesResult.data);
      }

      if (pathsResult.data && pathsResult.data.length > 0) {
        setFirstPath(pathsResult.data[0]);
      }

      if (profileResult.data?.display_name) {
        setDisplayName(profileResult.data.display_name);
      } else {
        const defaultName = user.email?.split('@')[0] || 'there';
        setDisplayName(defaultName);
      }
    };

    fetchGamificationData();
  }, [user]);

  const handleFeaturedClick = async () => {
    setFeaturedDialogOpen(true);
    setLoadingContent(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-featured-content', {
        body: { topic: dailyTopic.title }
      });

      if (error) throw error;
      setFeaturedContent(data.content);
    } catch (error) {
      console.error('Error generating featured content:', error);
      toast({
        title: "Unable to load content",
        description: "Please try again later.",
        variant: "destructive"
      });
      setFeaturedDialogOpen(false);
    } finally {
      setLoadingContent(false);
    }
  };

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <h2 className="text-4xl font-light tracking-wide">Hey, {displayName || 'there'}</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/5">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="font-semibold text-sm">{userStats?.current_streak || 0}</span>
            </div>
          </div>
        </div>

        {/* Streak Calendar */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-medium text-muted-foreground">DAILY STREAKS</span>
            <Flame className="h-4 w-4 text-orange-500" />
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date, i) => {
              const isToday = date.toDateString() === new Date().toDateString();
              const hasStreak = streaks.some(s => s.toDateString() === date.toDateString());
              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              
              return (
                <div key={i} className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">{dayNames[date.getDay()]}</div>
                  <div className={`text-sm font-medium rounded-lg py-2 transition-colors ${
                    hasStreak 
                      ? 'bg-primary text-primary-foreground' 
                      : isToday 
                      ? 'border-2 border-primary' 
                      : 'bg-muted/30'
                  }`}>
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Badges Section */}
        {earnedBadges.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Recent Badges</p>
            <div className="grid grid-cols-3 gap-3">
              {earnedBadges.map((badge: any, index: number) => (
                <Card key={index} className="p-3 text-center">
                  <div className="text-2xl mb-1">{badge.badges.icon}</div>
                  <p className="text-xs font-medium">{badge.badges.name}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Main Future Self Card */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Your Future Self</p>
          <Card 
            className="bg-card-dark text-card-dark-foreground overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => onNavigate('future')}
          >
            {firstPath ? (
              <>
                <div className="aspect-[4/5] relative bg-gradient-to-br from-neutral-800 to-neutral-900">
                  <img 
                    src={firstPath.image_url || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop"} 
                    alt={firstPath.title}
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl font-bold text-white mb-1">{firstPath.title}</h3>
                    <p className="text-sm text-neutral-300">{firstPath.journey_duration}</p>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm text-neutral-400 mb-4 line-clamp-2">
                    {firstPath.description}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-300">Start your transformation</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="aspect-[4/5] relative bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="w-24 h-24 rounded-full bg-neutral-700 mx-auto mb-4" />
                    <p className="text-sm text-neutral-400 mb-2">Your future self awaits</p>
                    <h3 className="text-lg font-semibold mb-1">Generate Your Vision</h3>
                    <p className="text-xs text-neutral-500">Upload your photo to see who you'll become</p>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">See Your Path</h3>
                  <p className="text-sm text-neutral-400 mb-4">
                    Discover your future self and the journey to become them.
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-500">Start your transformation</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Daily Missions */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Today's Missions</p>
          <div className="space-y-3">
            {dailyMissions.map((mission, index) => {
              const Icon = mission.icon;
              return (
                <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1">{mission.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        {mission.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{mission.duration}</span>
                        <span>•</span>
                        <span>{mission.type}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Featured */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Featured Today</p>
          <Card 
            className="p-6 cursor-pointer hover:shadow-lg transition-all group"
            onClick={handleFeaturedClick}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <Lightbulb className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">{dailyTopic.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {dailyTopic.description}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Card>
        </div>

        {/* Featured Content Drawer */}
        <Drawer open={featuredDialogOpen} onOpenChange={setFeaturedDialogOpen}>
          <DrawerContent className="max-h-[90vh]">
            <div className="relative overflow-y-auto">
              {/* Header */}
              <div className="text-center pt-8 pb-6 px-6 border-b sticky top-0 bg-background z-10">
                <h2 className="text-2xl font-bold mb-2">{dailyTopic.title}</h2>
                <p className="text-sm text-muted-foreground">Personalized insights for your journey</p>
              </div>
              
              {/* Close Button */}
              <Button 
                variant="ghost" 
                size="icon"
                className="absolute top-4 right-4 rounded-full z-20"
                onClick={() => setFeaturedDialogOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>

              {/* Content Card */}
              <div className="p-6">
                <div className="bg-muted/30 rounded-2xl p-8 min-h-[300px]">
                  {loadingContent ? (
                    <div className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-4/6" />
                      <div className="pt-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {featuredContent.split('\n\n').map((paragraph, idx) => (
                        <p key={idx} className="text-foreground/90 leading-relaxed text-[15px]">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="px-6 pb-8 sticky bottom-0 bg-background">
                <Button 
                  className="w-full h-12 rounded-full text-base font-semibold" 
                  onClick={() => setFeaturedDialogOpen(false)}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Continue Your Journey
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
};
