import { Target, CheckCircle2, Circle, Sparkles, MessageSquare, Zap, Award, TrendingUp, X, Map, Briefcase, Bot, Lock, BookOpen, Users, Lightbulb, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useBadgeAwarding } from "@/hooks/useBadgeAwarding";
import { BadgeCelebration } from "@/components/BadgeCelebration";

export const ActionPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkAndAwardBadges, newlyAwardedBadge, clearCelebration } = useBadgeAwarding();
  const [activePath, setActivePath] = useState<any>(null);
  const [allPaths, setAllPaths] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [quickWinsOpen, setQuickWinsOpen] = useState(false);
  const [goals, setGoals] = useState<any[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [todayActions, setTodayActions] = useState<any[]>([]);
  const [loadingActions, setLoadingActions] = useState(false);

  const guidanceLevels = [
    {
      level: 1,
      name: "Foundation",
      icon: BookOpen,
      description: "Essential skills and core knowledge",
      unlocked: true,
      color: "bg-blue-500",
    },
    {
      level: 2,
      name: "Development",
      icon: Target,
      description: "Intermediate skills and practical experience",
      unlocked: false,
      color: "bg-purple-500",
    },
    {
      level: 3,
      name: "Specialization",
      icon: Lightbulb,
      description: "Advanced expertise in key areas",
      unlocked: false,
      color: "bg-green-500",
    },
    {
      level: 4,
      name: "Leadership",
      icon: Users,
      description: "Team management and strategic thinking",
      unlocked: false,
      color: "bg-orange-500",
    },
    {
      level: 5,
      name: "Innovation",
      icon: Sparkles,
      description: "Creative problem-solving and innovation",
      unlocked: false,
      color: "bg-pink-500",
    },
    {
      level: 6,
      name: "Influence",
      icon: TrendingUp,
      description: "Industry impact and thought leadership",
      unlocked: false,
      color: "bg-indigo-500",
    },
    {
      level: 7,
      name: "Mastery",
      icon: Award,
      description: "Expert-level proficiency and recognition",
      unlocked: false,
      color: "bg-red-500",
    },
    {
      level: 8,
      name: "Mentorship",
      icon: MessageSquare,
      description: "Guide others and build community",
      unlocked: false,
      color: "bg-teal-500",
    },
    {
      level: 9,
      name: "Transformation",
      icon: Zap,
      description: "Drive industry transformation",
      unlocked: false,
      color: "bg-yellow-500",
    },
    {
      level: 10,
      name: "Legacy",
      icon: Trophy,
      description: "Create lasting impact and legacy",
      unlocked: false,
      color: "bg-amber-500",
    },
  ];

  // Always reload when component mounts or user changes
  useEffect(() => {
    loadData();
  }, [user]);

  // Also reload when page becomes visible (browser tab focus)
  useEffect(() => {
    const handleFocus = () => {
      loadData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch all paths and profile in parallel
      const [profileResult, allPathsResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('active_path_id')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('career_paths')
          .select('id, title, category')
          .eq('user_id', user.id)
      ]);

      const profile = profileResult.data;
      setAllPaths(allPathsResult.data || []);

      if (profile?.active_path_id) {
        // Get the career path details
        const { data: path } = await supabase
          .from('career_paths')
          .select('*')
          .eq('id', profile.active_path_id)
          .single();

        setActivePath(path);

        // Get goals for this path
        const { data: goalsData } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('path_id', profile.active_path_id)
          .order('priority', { ascending: false })
          .order('created_at', { ascending: true });

        if (goalsData) {
          setGoals(goalsData);
        }

        // Check if we have today's actions already
        const today = new Date().toISOString().split('T')[0];
        const { data: existingActions } = await supabase
          .from('daily_actions')
          .select('*')
          .eq('user_id', user.id)
          .eq('action_date', today)
          .maybeSingle();

        if (existingActions && !existingActions.all_completed) {
          // Use existing actions if they exist and aren't all completed
          setTodayActions(existingActions.actions as any[]);
        } else {
          // Generate new actions if none exist or all previous ones completed
          await generateTodaysActions(path);
        }
      } else {
        // No active path
        setTodayActions([{ task: "Activate a career path to get started", priority: "low", done: false }]);
      }

      // Get user stats
      let { data: stats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Create default stats if they don't exist
      if (!stats) {
        const { data: newStats } = await supabase
          .from('user_stats')
          .insert({
            user_id: user.id,
            current_streak: 0,
            total_points: 0,
            missions_completed: 0,
            paths_explored: 0
          })
          .select()
          .single();
        
        stats = newStats;
      }

      setUserStats(stats);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTodaysActions = async (path?: any) => {
    const activePathData = path || activePath;
    if (!user || !activePathData) return;

    setLoadingActions(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const { data, error } = await supabase.functions.invoke('generate-personalized-guidance', {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (!data?.dailyActions || data.dailyActions.length === 0) {
        throw new Error('No actions generated');
      }

      // Transform the AI-generated actions into the expected format
      const parsedActions = data.dailyActions.map((action: any, idx: number) => {
        let label = "Action";
        let priority = "medium";
        
        if (idx === 0) {
          label = `Morning (${action.timeNeeded || '30min'})`;
          priority = "high";
        } else if (idx === 1) {
          label = `Afternoon (${action.timeNeeded || '1hr'})`;
          priority = "medium";
        } else if (idx === 2) {
          label = `Evening (${action.timeNeeded || '15min'})`;
          priority = "low";
        }

        return {
          task: action.action,
          priority,
          done: false,
          label,
          rationale: action.rationale
        };
      });

      setTodayActions(parsedActions);

      // Save to database
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('daily_actions')
        .upsert({
          user_id: user.id,
          path_id: activePathData.id,
          action_date: today,
          actions: parsedActions,
          all_completed: false
        }, {
          onConflict: 'user_id,action_date'
        });

    } catch (error) {
      console.error('Error generating actions:', error);
      
      // Check if it's a function invocation error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log('Error details:', errorMessage);
      
      toast({
        title: "Unable to generate actions",
        description: "Our AI is having trouble right now. Please refresh the page.",
        variant: "destructive"
      });
      
      // Show empty state instead of generic fallback
      setTodayActions([{
        task: "AI guidance temporarily unavailable - refresh to try again",
        priority: "medium",
        done: false,
        label: "Status"
      }]);
    } finally {
      setLoadingActions(false);
    }
  };

  const roadmapMilestones = activePath?.roadmap || [];

  const goalsCompleted = goals.filter(g => g.completed).length;
  const totalGoals = goals.length;

  const quickWinsSuggestions = activePath ? [
    `Update LinkedIn with "${activePath.title}" as target role`,
    `Spend 15 minutes researching ${activePath.target_companies?.[0] || 'top companies'}`,
    `Watch one tutorial about ${activePath.key_skills?.[0] || 'key skills'}`,
    `Connect with one person working as ${activePath.title}`,
    `Read one article about ${activePath.category} careers`,
  ] : [
    "Activate a career path first",
  ];

  const handleSetActivePath = async (pathId: string) => {
    if (!user || pathId === activePath?.id) return;
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ active_path_id: pathId })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      // Check and award badges after activating path
      await checkAndAwardBadges();
      
      // Reload all data to update with new active path
      await loadData();
      
      toast({
        title: "Active path updated",
        description: "Your actions are now personalized to your new path."
      });
    } catch (error) {
      console.error('Error updating active path:', error);
      toast({
        title: "Failed to update path",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleToggleGoal = async (goalId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ completed: !completed })
        .eq('id', goalId);

      if (error) throw error;

      // Update local state
      setGoals(goals.map(g => 
        g.id === goalId ? { ...g, completed: !completed } : g
      ));

      if (!completed) {
        toast({
          title: "Goal completed!",
          description: "Great progress on your journey.",
        });
      }
    } catch (error) {
      console.error('Error toggling goal:', error);
    }
  };

  const handleToggleAction = async (index: number) => {
    if (!user || !activePath) return;

    try {
      // Update local state
      const updatedActions = [...todayActions];
      updatedActions[index] = { ...updatedActions[index], done: !updatedActions[index].done };
      setTodayActions(updatedActions);

      // Check if all actions are completed
      const allCompleted = updatedActions.every(action => action.done);

      // Save to database
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('daily_actions')
        .upsert({
          user_id: user.id,
          path_id: activePath.id,
          action_date: today,
          actions: updatedActions,
          all_completed: allCompleted
        }, {
          onConflict: 'user_id,action_date'
        });

      if (error) throw error;

      if (!updatedActions[index].done) {
        toast({
          title: "Action reopened",
          description: "Keep working on this task"
        });
      } else {
        toast({
          title: "Action completed! 🎉",
          description: allCompleted ? "All today's actions completed! New actions will be generated tomorrow." : "Great progress!"
        });

        // Award badge if all completed
        if (allCompleted) {
          await checkAndAwardBadges();
        }
      }
    } catch (error) {
      console.error('Error toggling action:', error);
      toast({
        title: "Error",
        description: "Failed to update action",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="px-4 pb-24 pt-4">
        <div className="max-w-md mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Active Path Info */}
        {activePath ? (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-primary mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Active Path</h3>
                  <p className="text-sm text-muted-foreground">{activePath.title}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{activePath.category}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-muted/30">
            <CardContent className="p-6 text-center">
              <Map className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground mb-4">
                No active path yet. Activate a career path from your Futures to get started!
              </p>
            </CardContent>
          </Card>
        )}


        {/* Path Switcher Accordion - Show only if multiple paths */}
        {allPaths.length > 1 && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="paths" className="border-border/50 rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Switch Active Path</span>
                  <span className="text-xs text-muted-foreground">({allPaths.length} paths)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-2 pb-2">
                <div className="space-y-1">
                  {allPaths.map((path: any) => {
                    const isActive = path.id === activePath?.id;
                    return (
                      <button
                        key={path.id}
                        onClick={() => handleSetActivePath(path.id)}
                        disabled={isActive}
                        className={`w-full text-left px-3 py-2.5 rounded-md transition-all ${
                          isActive 
                            ? 'bg-primary/10 text-primary cursor-default' 
                            : 'hover:bg-muted/50 text-foreground hover:scale-[1.01]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{path.title}</p>
                            {path.category && (
                              <p className="text-xs text-muted-foreground mt-0.5">{path.category}</p>
                            )}
                          </div>
                          {isActive && (
                            <div className="ml-2 flex-shrink-0">
                              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* 10 Levels of Guidance */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Your Journey Levels</h3>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {guidanceLevels.map((level) => {
              const Icon = level.icon;
              return (
                <div
                  key={level.level}
                  className={`relative aspect-square rounded-lg ${
                    level.unlocked
                      ? level.color + " text-white"
                      : "bg-muted/50 text-muted-foreground"
                  } flex flex-col items-center justify-center p-2 ${
                    level.unlocked ? "cursor-pointer hover:opacity-90" : "cursor-not-allowed"
                  }`}
                  onClick={() => level.unlocked && setCurrentLevel(level.level)}
                >
                  {!level.unlocked && (
                    <Lock className="h-3 w-3 absolute top-1 right-1" />
                  )}
                  <Icon className="h-4 w-4 mb-1" />
                  <span className="text-[10px] font-medium text-center leading-tight">
                    {level.level}
                  </span>
                </div>
              );
            })}
          </div>
          
          {/* Current Level Details */}
          <Card className={`${guidanceLevels[currentLevel - 1].color} text-white`}>
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                {(() => {
                  const Icon = guidanceLevels[currentLevel - 1].icon;
                  return <Icon className="h-6 w-6 mt-1" />;
                })()}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold">Level {currentLevel}</h3>
                    <Badge variant="secondary" className="text-xs">Active</Badge>
                  </div>
                  <p className="text-sm font-medium mb-1">{guidanceLevels[currentLevel - 1].name}</p>
                  <p className="text-xs opacity-90">{guidanceLevels[currentLevel - 1].description}</p>
                </div>
              </div>
              
              {activePath && (
                <div className="space-y-2 pt-2 border-t border-white/20">
                  <p className="text-xs font-medium opacity-90">Current Focus:</p>
                  <p className="text-sm">
                    {activePath.roadmap?.[0]?.step || "Building your foundation in " + activePath.title}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Gamification Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary/70 stroke-[1.5]" />
              <div className="text-2xl font-bold">{userStats?.current_streak || 0}</div>
              <div className="text-xs text-muted-foreground">Day Streak</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Sparkles className="h-5 w-5 mx-auto mb-2 text-primary/70 stroke-[1.5]" />
              <div className="text-2xl font-bold">{userStats?.total_points || 0}</div>
              <div className="text-xs text-muted-foreground">Points</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-5 w-5 mx-auto mb-2 text-primary/70 stroke-[1.5]" />
              <div className="text-2xl font-bold">{goalsCompleted}/{totalGoals || '0'}</div>
              <div className="text-xs text-muted-foreground">Goals</div>
            </CardContent>
          </Card>
        </div>

        {/* Goals Section - Make it prominent */}
        {goals.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Your Goals</h3>
              <Badge variant="secondary">{goalsCompleted} of {totalGoals} completed</Badge>
            </div>
            <div className="space-y-2">
              {goals.slice(0, 3).map((goal: any) => (
                <Card key={goal.id} className={goal.completed ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button 
                        onClick={() => handleToggleGoal(goal.id, goal.completed)}
                        className="mt-1 flex-shrink-0"
                      >
                        {goal.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1">
                        <h4 className={`font-medium text-sm mb-1 ${goal.completed ? 'line-through' : ''}`}>
                          {goal.title}
                        </h4>
                        {goal.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {goal.description}
                          </p>
                        )}
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                          goal.priority === "high"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                            : goal.priority === "medium"
                            ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {goal.priority}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {goals.length > 3 && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setGoalDialogOpen(true)}
                >
                  View All {goals.length} Goals
                </Button>
              )}
            </div>
          </div>
        ) : activePath ? (
          <Card className="bg-muted/30">
            <CardContent className="p-6 text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50 animate-pulse" />
              <h4 className="font-medium mb-2">Generating Your Goals</h4>
              <p className="text-sm text-muted-foreground">
                Your personalized goals are being created. This may take a moment...
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Resources for Current Level */}
        {activePath && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Level {currentLevel} Resources</h3>
            <div className="space-y-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <BookOpen className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">Foundation Skills</h4>
                      <p className="text-xs text-muted-foreground">
                        {activePath.key_skills?.slice(0, 3).join(", ") || "Core competencies for your path"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">Target Companies</h4>
                      <p className="text-xs text-muted-foreground">
                        {activePath.target_companies?.slice(0, 2).join(", ") || "Research industry leaders"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">Impact Areas</h4>
                      <p className="text-xs text-muted-foreground">
                        {activePath.impact_areas?.slice(0, 2).join(", ") || "Focus on these domains"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Roadmap */}
        {activePath && roadmapMilestones.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Your Roadmap</h3>
            <div className="space-y-2">
              {roadmapMilestones.map((milestone: any, index: number) => (
                <Card key={index} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex-shrink-0 mt-0.5">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-1">{milestone.step}</h4>
                        <p className="text-xs text-muted-foreground">{milestone.duration}</p>
                      </div>
                     </div>
                  </CardContent>
              </Card>
            ))}
          </div>
        </div>
        )}

        {/* Affirmations */}
        {activePath && activePath.affirmations?.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3">Daily Affirmations</h3>
            <Card>
              <CardContent className="p-4 space-y-3">
                {activePath.affirmations.map((affirmation: string, index: number) => (
                  <div key={index} className="py-2 border-l-2 border-primary/30 pl-4">
                    <p className="text-sm italic text-foreground/90">"{affirmation}"</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Today's Actions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Today's Actions</h3>
            {activePath && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => generateTodaysActions()}
                disabled={loadingActions}
                className="h-7 text-xs"
              >
                {loadingActions ? "Generating..." : "Refresh"}
              </Button>
            )}
          </div>
          {loadingActions ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : (
            <div className="space-y-3">
              {todayActions.map((action: any, index: number) => (
                <Card key={index} className={action.done ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleAction(index)}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {action.done ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1">
                        {action.label && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-primary">
                              {action.label}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full ${
                                action.priority === "high"
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                  : action.priority === "medium"
                                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                              }`}
                            >
                              {action.priority}
                            </span>
                          </div>
                        )}
                        <p className={`text-sm text-foreground leading-relaxed ${action.done ? 'line-through' : ''}`}>
                          {action.task}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Tools */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Tools</h3>
          <div className="grid grid-cols-2 gap-3">
            <Drawer open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
              <DrawerTrigger asChild>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Target className="h-5 w-5" />
                  <span className="text-xs">View Goals</span>
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[80vh]">
                <div className="relative overflow-y-auto">
                  {/* Header */}
                  <div className="text-center pt-8 pb-6 px-6 border-b sticky top-0 bg-background z-10">
                    <h2 className="text-2xl font-bold mb-2">Your Goals</h2>
                    <p className="text-sm text-muted-foreground">Track your progress towards your future</p>
                  </div>
                  
                  {/* Close Button */}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="absolute top-4 right-4 rounded-full z-20"
                    onClick={() => setGoalDialogOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>

                  {/* Content Card */}
                  <div className="p-6">
                    <div className="bg-muted/30 rounded-2xl p-6 space-y-3">
                      {goals.length > 0 ? (
                        goals.map((goal: any) => (
                          <div
                            key={goal.id}
                            className="p-4 rounded-xl bg-background/50"
                          >
                            <div className="flex items-start gap-3">
                              <button 
                                onClick={() => handleToggleGoal(goal.id, goal.completed)}
                                className="mt-1 flex-shrink-0"
                              >
                                {goal.completed ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground" />
                                )}
                              </button>
                              <div className="flex-1">
                                <h4 className={`font-medium mb-1 ${goal.completed ? 'line-through' : ''}`}>
                                  {goal.title}
                                </h4>
                                {goal.description && (
                                  <p className="text-xs text-muted-foreground mb-2">
                                    {goal.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-xs px-2 py-1 rounded-full ${
                                      goal.priority === "high"
                                        ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                                        : goal.priority === "medium"
                                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                    }`}
                                  >
                                    {goal.priority}
                                  </span>
                                  {goal.target_date && (
                                    <span className="text-xs text-muted-foreground">
                                      Target: {new Date(goal.target_date).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                          <p className="text-sm text-muted-foreground">
                            Activate a career path to get personalized goals
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="px-6 pb-8 sticky bottom-0 bg-background">
                    <Button 
                      onClick={() => setGoalDialogOpen(false)}
                      className="w-full h-12 rounded-full text-base font-semibold"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Keep Going
                    </Button>
                  </div>
                </div>
              </DrawerContent>
            </Drawer>

            <Drawer open={quickWinsOpen} onOpenChange={setQuickWinsOpen}>
              <DrawerTrigger asChild>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Zap className="h-5 w-5" />
                  <span className="text-xs">Quick Wins</span>
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[80vh]">
                <div className="relative overflow-y-auto">
                  {/* Header */}
                  <div className="text-center pt-8 pb-6 px-6 border-b sticky top-0 bg-background z-10">
                    <h2 className="text-2xl font-bold mb-2">Quick Wins</h2>
                    <p className="text-sm text-muted-foreground">Small actions, big impact on your journey</p>
                  </div>
                  
                  {/* Close Button */}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="absolute top-4 right-4 rounded-full z-20"
                    onClick={() => setQuickWinsOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>

                  {/* Content Card */}
                  <div className="p-6">
                    <div className="bg-muted/30 rounded-2xl p-6 space-y-3">
                      {quickWinsSuggestions.map((win, idx) => (
                        <button
                          key={idx}
                          className="w-full text-left p-4 rounded-xl bg-background/50 hover:bg-background transition-colors"
                          onClick={() => {
                            toast({
                              title: "Nice!",
                              description: "Task added to today's actions.",
                            });
                            setQuickWinsOpen(false);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-sm leading-relaxed">{win}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="px-6 pb-6 sticky bottom-0 bg-background">
                    <Button 
                      onClick={() => setQuickWinsOpen(false)}
                      className="w-full h-12 rounded-full text-base font-semibold"
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Start Taking Action
                    </Button>
                  </div>
                </div>
                </DrawerContent>
              </Drawer>

              <Button variant="outline" className="h-20 flex flex-col gap-2" disabled>
                <Briefcase className="h-5 w-5" />
                <span className="text-xs">Partners Jobs (soon)</span>
              </Button>

              <Button variant="outline" className="h-20 flex flex-col gap-2" disabled>
                <Bot className="h-5 w-5" />
                <span className="text-xs">Automations (soon)</span>
              </Button>
            </div>
          </div>
      </div>
      
      <BadgeCelebration badge={newlyAwardedBadge} onComplete={clearCelebration} />
    </div>
  );
};
