import { ChevronRight, Target, BookOpen, Compass, Flame, Award, Lightbulb, X, ArrowRight, Play, Pause, Check, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useDailyStreak } from "@/hooks/useDailyStreak";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DailyMotivation } from "./DailyMotivation";
import { Textarea } from "@/components/ui/textarea";

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

// Core missions that should always be present every day
const coreMissions = [
  {
    icon: Target,
    title: "Think About Your Core Values",
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
    type: "Journaling"
  }
];

const defaultMissions = [
  {
    icon: Video,
    title: "Watch Tutorial Video",
    description: "Learn key insights for your journey",
    duration: "3 min",
    type: "Learning"
  },
  ...coreMissions
];

const getFeaturedTopicForUser = (activePath: any, stats: any, allPaths: any[]) => {
  const topics = [
    { 
      title: "Design Your Future", 
      description: "A guided pathway to visualize and plan your ideal future self",
      condition: !activePath // For users without active path
    },
    { 
      title: "Master Key Skills", 
      description: `Accelerate your ${activePath?.category || 'career'} development`,
      condition: activePath && stats?.current_streak > 0 // Active users
    },
    { 
      title: "Build Your Network", 
      description: "Strategic approaches to connect with the right people in your field",
      condition: activePath // Users with paths
    },
    { 
      title: "Navigate Market Trends", 
      description: `Current insights for ${activePath?.category || 'your industry'}`,
      condition: activePath // Users with paths
    },
    { 
      title: "Explore New Directions", 
      description: "Discover adjacent career paths and opportunities",
      condition: allPaths?.length > 2 // Users exploring multiple paths
    },
    { 
      title: "Stay Consistent", 
      description: "Build habits that transform your career trajectory",
      condition: stats?.current_streak < 3 // Users who need motivation
    },
    { 
      title: "Leverage Your Experience", 
      description: "Turn your background into your competitive advantage",
      condition: activePath // Users with defined paths
    },
  ];

  // Filter topics that match current user state
  const relevantTopics = topics.filter(t => t.condition !== false);
  
  // Rotate through relevant topics daily
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  return relevantTopics[dayOfYear % relevantTopics.length] || topics[0];
};


export const HomePage = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const { toast } = useToast();
  const { user } = useAuth();
  useDailyStreak(); // Track daily login and update streak
  const [userStats, setUserStats] = useState<any>(null);
  const [streaks, setStreaks] = useState<Date[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<any[]>([]);
  const [firstPath, setFirstPath] = useState<any>(null);
  const [featuredDialogOpen, setFeaturedDialogOpen] = useState(false);
  const [featuredContent, setFeaturedContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const [displayName, setDisplayName] = useState<string>('');
  const [activePath, setActivePath] = useState<any>(null);
  const [allPaths, setAllPaths] = useState<any[]>([]);
  const [showDailyMotivation, setShowDailyMotivation] = useState(false);
  const [clickedDay, setClickedDay] = useState<number | null>(null);
  const [clickedBadge, setClickedBadge] = useState<number | null>(null);
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const [missionLog, setMissionLog] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [dailyMissions, setDailyMissions] = useState<any[]>(defaultMissions);
  const [completedMissions, setCompletedMissions] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Memoize week dates (only changes when date changes)
  const weekDates = useMemo(() => getWeekDates(), []);
  
  // Dynamic topic based on user context - memoized
  const dailyTopic = useMemo(
    () => getFeaturedTopicForUser(activePath, userStats, allPaths),
    [activePath, userStats?.current_streak, allPaths.length]
  );

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Show daily motivation every time streak increases
  useEffect(() => {
    if (!userStats) return; // Wait for stats to load
    if (!userStats.current_streak || userStats.current_streak === 0) return;

    const lastStreakShown = localStorage.getItem("lastStreakMotivationShown");
    const lastStreakValue = lastStreakShown ? parseInt(lastStreakShown) : 0;

    // Show motivation if current streak is higher than last shown
    if (userStats.current_streak > lastStreakValue) {
      setTimeout(() => {
        setShowDailyMotivation(true);
        localStorage.setItem("lastStreakMotivationShown", userStats.current_streak.toString());
      }, 500);
    }
  }, [userStats?.current_streak]);

  const generateDailyMissions = async (path: any) => {
    if (!path || !user) return;

    try {
      const { data, error } = await supabase.functions.invoke('generate-daily-missions', {
        body: { 
          pathId: path.id,
          pathTitle: path.title,
          pathDescription: path.description,
          category: path.category,
          keySkills: path.key_skills || [],
          roadmap: path.roadmap || []
        }
      });

      if (error) throw error;

      if (data?.missions) {
        // Always include core missions + optionally one generated mission
        const shouldIncludeVideo = !userStats || userStats.current_streak < 2;
        const videoMission = defaultMissions[0];
        const generatedMission = data.missions[0]; // Take first AI-generated mission
        
        const dailyMissionsList = shouldIncludeVideo 
          ? [videoMission, ...coreMissions, generatedMission].filter(Boolean)
          : [...coreMissions, generatedMission].filter(Boolean);
        
        setDailyMissions(dailyMissionsList);

        // Store in database
        const today = new Date().toISOString().split('T')[0];
        const actionsToStore = dailyMissionsList.map((m: any) => ({
          title: m.title,
          description: m.description,
          duration: m.duration,
          type: m.type,
          completed: false
        }));

        const existing = await supabase
          .from('daily_actions')
          .select('id')
          .eq('user_id', user.id)
          .eq('action_date', today)
          .limit(1)
          .maybeSingle();

        if (existing.error) throw existing.error;
        if (existing.data) {
          await supabase
            .from('daily_actions')
            .update({ actions: actionsToStore, all_completed: false, path_id: path.id })
            .eq('user_id', user.id)
            .eq('action_date', today);
        } else {
          await supabase
            .from('daily_actions')
            .insert({
              user_id: user.id,
              path_id: path.id,
              action_date: today,
              actions: actionsToStore,
              all_completed: false
            });
        }
      }
    } catch (error) {
      console.error('Error generating daily missions:', error);
      // Keep default missions on error
      setDailyMissions(defaultMissions);
    }
  };

  useEffect(() => {
    const fetchGamificationData = async () => {
      if (!user) return;

      const weekStart = weekDates[0].toISOString().split('T')[0];
      const weekEnd = weekDates[6].toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      // Fetch only essential data in parallel - optimized queries
      const [statsResult, streakResult, badgesResult, profileResult, pathsResult, dailyActionsResult] = await Promise.all([
        supabase
          .from('user_stats')
          .select('current_streak, longest_streak, total_points')
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
          .select('badges (name, icon, description)')
          .eq('user_id', user.id)
          .order('earned_at', { ascending: false })
          .limit(3),
        supabase
          .from('user_profiles')
          .select('display_name, active_path_id')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('career_paths')
          .select('id, title, description, image_url, journey_duration, category, key_skills, target_companies')
          .eq('user_id', user.id)
          .limit(10),
        supabase
          .from('daily_actions')
          .select('actions, all_completed, created_at')
          .eq('user_id', user.id)
          .eq('action_date', today)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      // Process results efficiently
      if (profileResult.data) {
        setDisplayName(profileResult.data.display_name || user.email?.split('@')[0] || 'there');
        
        if (profileResult.data.active_path_id && pathsResult.data) {
          const activePathData = pathsResult.data.find(p => p.id === profileResult.data.active_path_id);
          setActivePath(activePathData || null);
          setFirstPath(activePathData || null); // Show active path on dashboard
          
          // Generate daily missions if none exist for today
          if (!dailyActionsResult.data?.actions && activePathData) {
            generateDailyMissions(activePathData);
          }
        }
      }

      if (pathsResult.data) {
        setAllPaths(pathsResult.data);
        // Only set firstPath if not already set by active path
        if (!profileResult.data?.active_path_id) {
          setFirstPath(pathsResult.data[0] || null);
        }
      }

      setUserStats(statsResult.data || { current_streak: 0, longest_streak: 0, total_points: 0 });
      setStreaks(streakResult.data?.map(s => new Date(s.streak_date)) || []);
      setEarnedBadges(badgesResult.data || []);

      // Handle daily missions
      if (dailyActionsResult.data?.actions) {
        const actions = dailyActionsResult.data.actions as any[];
        if (actions.length > 0) {
          // Filter out video tutorial if streak >= 2
          const shouldIncludeVideo = !statsResult.data || statsResult.data.current_streak < 2;
          const filteredActions = shouldIncludeVideo 
            ? actions 
            : actions.filter((action: any) => 
                !action.title.includes('Video') && !action.title.includes('Tutorial')
              );

          // Map stored actions to mission format
          const missions = filteredActions.map((action: any) => ({
            icon: action.completed ? Check : 
                  action.title.includes('Video') || action.title.includes('Tutorial') ? Video :
                  action.title.includes('Values') || action.title.includes('Reflect') ? Target :
                  action.title.includes('Document') || action.title.includes('Progress') ? BookOpen : Compass,
            title: action.title,
            description: action.description,
            duration: action.duration || "5 min",
            type: action.type || "Task",
            completed: action.completed || false,
            suggestions: action.suggestions || []
          }));
          setDailyMissions(missions);
          
          // Track completed missions
          const completed = new Set(
            actions.filter((a: any) => a.completed).map((a: any) => a.title)
          );
          setCompletedMissions(completed);

          // Check if all missions completed for celebration
          if (actions.length > 0 && actions.every((a: any) => a.completed)) {
            const celebrationShown = localStorage.getItem(`celebration_${today}`);
            if (!celebrationShown) {
              setTimeout(() => {
                setShowCelebration(true);
                localStorage.setItem(`celebration_${today}`, 'true');
              }, 1000);
            }
          }
        }
      }
    };

    fetchGamificationData();
    
    // Listen for streak updates and refresh data
    const handleStreakUpdate = () => {
      fetchGamificationData();
    };
    window.addEventListener('streakUpdated', handleStreakUpdate);
    
    return () => {
      window.removeEventListener('streakUpdated', handleStreakUpdate);
    };
  }, [user?.id]);

  const handleFeaturedClick = async () => {
    setFeaturedDialogOpen(true);
    
    // Check cache first (5 minute expiry)
    const cacheKey = `featured_${dailyTopic.title}_${user?.id}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { content, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 5 * 60 * 1000) { // 5 minutes
          setFeaturedContent(content);
          return;
        }
      } catch {}
    }
    
    setLoadingContent(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-featured-content', {
        body: { topic: dailyTopic.title }
      });

      if (error) throw error;
      
      setFeaturedContent(data.content);
      // Cache the result
      localStorage.setItem(cacheKey, JSON.stringify({
        content: data.content,
        timestamp: Date.now()
      }));
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

  const handleMissionClick = (mission: any) => {
    setSelectedMission(mission);
    setMissionLog("");
    setTimerSeconds(0);
    setTimerActive(false);
    setLogDrawerOpen(true);
  };

  const isMeditationMission = (title: string) => {
    return title.toLowerCase().includes('visualize') || title.toLowerCase().includes('meditation');
  };

  const isVideoMission = (title: string) => {
    return title.toLowerCase().includes('video') || title.toLowerCase().includes('tutorial');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const handleSaveMissionLog = async () => {
    if (!isVideoMission(selectedMission?.title || '') && !missionLog.trim()) {
      toast({
        title: "Please add a note",
        description: "Share what you learned or experienced.",
        variant: "destructive"
      });
      return;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Mark mission as completed
      const updatedMissions = dailyMissions.map(m => 
        m.title === selectedMission?.title ? { ...m, completed: true } : m
      );
      
      const actionsToStore = updatedMissions.map(m => ({
        title: m.title,
        description: m.description,
        duration: m.duration,
        type: m.type,
        completed: m.completed || false,
        log: m.title === selectedMission?.title ? missionLog : undefined
      }));

      const allCompleted = updatedMissions.every(m => m.completed);

      const existing = await supabase
        .from('daily_actions')
        .select('id')
        .eq('user_id', user!.id)
        .eq('action_date', today)
        .limit(1)
        .maybeSingle();

      if (existing.error) throw existing.error;
      if (existing.data) {
        await supabase
          .from('daily_actions')
          .update({
            actions: actionsToStore,
            all_completed: allCompleted
          })
          .eq('user_id', user!.id)
          .eq('action_date', today);
      } else {
        await supabase
          .from('daily_actions')
          .insert({
            user_id: user!.id,
            path_id: activePath?.id,
            action_date: today,
            actions: actionsToStore,
            all_completed: allCompleted
          });
      }

      // Update local state with completed mission
      setDailyMissions(updatedMissions);
      setCompletedMissions(prev => new Set([...prev, selectedMission?.title]));

      // Check if all missions are now completed
      const newCompletedCount = completedMissions.size + 1;
      if (newCompletedCount === dailyMissions.length) {
        setTimeout(() => setShowCelebration(true), 300);
      }

      toast({
        title: "Mission logged! 🎉",
        description: "Your progress has been recorded."
      });
    } catch (error) {
      console.error('Error saving mission:', error);
      toast({
        title: "Error",
        description: "Failed to save mission. Please try again.",
        variant: "destructive"
      });
    }

    setLogDrawerOpen(false);
    setMissionLog("");
    setTimerSeconds(0);
    setTimerActive(false);
  };

  return (
    <>
      <DailyMotivation 
        open={showDailyMotivation} 
        onOpenChange={setShowDailyMotivation}
        pathTitle={activePath?.title}
      />

      {/* Celebration Animation */}
      {showCelebration && (
        <div 
          className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          onClick={() => setShowCelebration(false)}
        >
          <div className="animate-scale-in">
            <div className="relative">
              {/* Central glow */}
              <div className="absolute inset-0 animate-ping opacity-30">
                <div className="w-32 h-32 rounded-full bg-primary/40 blur-xl" />
              </div>
              
              {/* Main celebration card */}
              <div className="relative bg-background/95 backdrop-blur-sm border-2 border-primary/20 rounded-3xl p-8 shadow-2xl animate-fade-in">
                <div className="text-center space-y-4">
                  <div className="text-6xl animate-bounce">🎉</div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    All Missions Complete!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Amazing progress today
                  </p>
                </div>
              </div>

              {/* Particle effects */}
              <div className="absolute -top-4 -left-4 w-3 h-3 rounded-full bg-primary animate-ping" style={{ animationDelay: '0.1s' }} />
              <div className="absolute -top-2 -right-6 w-2 h-2 rounded-full bg-primary/60 animate-ping" style={{ animationDelay: '0.3s' }} />
              <div className="absolute -bottom-3 left-8 w-2 h-2 rounded-full bg-primary/40 animate-ping" style={{ animationDelay: '0.5s' }} />
              <div className="absolute -bottom-4 -right-4 w-3 h-3 rounded-full bg-primary/60 animate-ping" style={{ animationDelay: '0.2s' }} />
              <div className="absolute top-1/2 -left-8 w-2 h-2 rounded-full bg-primary/40 animate-ping" style={{ animationDelay: '0.4s' }} />
              <div className="absolute top-1/3 -right-8 w-2 h-2 rounded-full bg-primary/60 animate-ping" style={{ animationDelay: '0.6s' }} />
            </div>
          </div>
          
          {/* Dismiss button */}
          <button 
            onClick={() => setShowCelebration(false)}
            className="absolute top-8 right-8 pointer-events-auto w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
      
      <div className="px-4 pb-24 pt-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-light tracking-wide">Hey, {displayName || 'there'}</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/5">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="font-semibold text-sm">{userStats?.current_streak || 0}</span>
            </div>
          </div>
        </div>

        {/* Streak Calendar */}
        <Card className="p-4">
          <div className="mb-4">
            <span className="text-xs font-medium text-muted-foreground">DAILY STREAKS</span>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date, i) => {
              const isToday = date.toDateString() === new Date().toDateString();
              const hasStreak = streaks.some(s => s.toDateString() === date.toDateString());
              const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              const isClicked = clickedDay === i;
              
              return (
                <div key={i} className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">{dayNames[date.getDay()]}</div>
                  <div 
                    className={`text-sm font-medium rounded-lg py-2 transition-all duration-300 flex items-center justify-center gap-1 cursor-pointer relative ${
                      hasStreak 
                        ? 'bg-primary text-primary-foreground' 
                        : isToday 
                        ? 'border-2 border-primary' 
                        : 'bg-muted/30'
                    } ${isClicked ? 'fire-burst' : ''}`}
                    onClick={() => {
                      if (hasStreak) {
                        setClickedDay(i);
                        setTimeout(() => setClickedDay(null), 800);
                      }
                    }}
                  >
                    {date.getDate()}
                    {hasStreak && <Flame className={`h-3 w-3 text-orange-500 transition-all ${isClicked ? 'fire-icon' : ''}`} />}
                    {isClicked && hasStreak && (
                      <>
                        <Flame className="absolute h-4 w-4 text-orange-500 fire-particle fire-particle-1" />
                        <Flame className="absolute h-3 w-3 text-red-500 fire-particle fire-particle-2" />
                        <Flame className="absolute h-3 w-3 text-yellow-500 fire-particle fire-particle-3" />
                      </>
                    )}
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
                <Card 
                  key={index} 
                  className={`p-3 text-center cursor-pointer transition-all duration-300 ${
                    clickedBadge === index ? 'badge-pump' : ''
                  }`}
                  onClick={() => {
                    setClickedBadge(index);
                    setTimeout(() => setClickedBadge(null), 600);
                  }}
                >
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
            onClick={() => onNavigate('copilot')}
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
              const isCompleted = completedMissions.has(mission.title);
              return (
                <Card 
                  key={index} 
                  className={`p-4 transition-all cursor-pointer ${
                    isCompleted 
                      ? 'bg-primary/5 border-primary/20' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => !isCompleted && handleMissionClick(mission)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCompleted ? 'bg-primary text-primary-foreground' : 'bg-primary/5'
                    }`}>
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5 text-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold text-sm mb-1 ${
                        isCompleted ? 'line-through text-muted-foreground' : ''
                      }`}>
                        {mission.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mb-2">
                        {mission.description}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{mission.duration}</span>
                        <span>•</span>
                        <span>{mission.type}</span>
                      </div>
                    </div>
                    {!isCompleted && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
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

        {/* Mission Log Drawer */}
        <Drawer open={logDrawerOpen} onOpenChange={setLogDrawerOpen}>
          <DrawerContent className="max-h-[90vh]">
            <div className="relative overflow-y-auto">
              <div className="text-center pt-8 pb-6 px-6 border-b sticky top-0 bg-background z-10">
                <h2 className="text-2xl font-bold mb-2">{selectedMission?.title}</h2>
                <p className="text-sm text-muted-foreground">{selectedMission?.description}</p>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon"
                className="absolute top-4 right-4 rounded-full z-20"
                onClick={() => setLogDrawerOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>

              <div className="p-6 space-y-6">
                {isVideoMission(selectedMission?.title || '') && (
                  <div className="bg-muted/30 rounded-2xl p-6">
                    <div style={{ position: "relative", paddingBottom: "140.99216710182768%", height: 0 }}>
                      <iframe 
                        src="https://www.loom.com/embed/977861e8549745d68180aef5b7450433" 
                        frameBorder="0" 
                        allowFullScreen
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", borderRadius: "12px" }}
                      />
                    </div>
                  </div>
                )}

                {isMeditationMission(selectedMission?.title || '') && (
                  <div className="bg-muted/30 rounded-2xl p-6">
                    <div className="text-center mb-4">
                      <div className="text-5xl font-light mb-2">{formatTime(timerSeconds)}</div>
                      <p className="text-sm text-muted-foreground">Meditation Timer</p>
                    </div>
                    <div className="flex gap-2 justify-center mb-4">
                      {[5, 10, 15].map((mins) => (
                        <Button
                          key={mins}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setTimerSeconds(mins * 60);
                            setTimerActive(false);
                          }}
                          className="rounded-full"
                        >
                          {mins}m
                        </Button>
                      ))}
                    </div>
                    <Button
                      className="w-full rounded-full"
                      onClick={() => setTimerActive(!timerActive)}
                      disabled={timerSeconds === 0}
                    >
                      {timerActive ? (
                        <>
                          <Pause className="h-4 w-4 mr-2" /> Pause
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" /> Start
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {!isVideoMission(selectedMission?.title || '') && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Reflection Note</label>
                    <Textarea
                      placeholder="What did you learn or experience? Share your thoughts..."
                      value={missionLog}
                      onChange={(e) => setMissionLog(e.target.value.slice(0, 140))}
                      className="min-h-[120px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {missionLog.length}/140
                    </p>
                  </div>
                )}

                {isVideoMission(selectedMission?.title || '') && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Key Takeaway (Optional)</label>
                    <Textarea
                      placeholder="What's your main insight from this video?"
                      value={missionLog}
                      onChange={(e) => setMissionLog(e.target.value.slice(0, 140))}
                      className="min-h-[80px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {missionLog.length}/140
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 pb-8 sticky bottom-0 bg-background">
                <Button 
                  className="w-full h-12 rounded-full text-base font-semibold" 
                  onClick={handleSaveMissionLog}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Complete Mission
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
      </div>
    </>
  );
};
