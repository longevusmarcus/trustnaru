import { Target, CheckCircle2, Circle, Sparkles, MessageSquare, Zap, Award, TrendingUp, X } from "lucide-react";
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

export const ActionPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activePath, setActivePath] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [quickWinsOpen, setQuickWinsOpen] = useState(false);
  const [newGoal, setNewGoal] = useState("");
  const [goals, setGoals] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Get user profile with active path
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('active_path_id')
        .eq('user_id', user.id)
        .maybeSingle();

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

  const roadmapMilestones = activePath?.roadmap || [];

  // Generate today's actions based on the first roadmap step
  const todayActions = activePath && roadmapMilestones.length > 0 ? [
    { task: `Start: ${roadmapMilestones[0].step}`, priority: "high", done: false },
    { task: `Research resources for ${activePath.title}`, priority: "medium", done: false },
    { task: `Connect with someone in ${activePath.category} field`, priority: "medium", done: false },
  ] : [
    { task: "Activate a career path to get started", priority: "low", done: false },
  ];

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

  const handleAddGoal = async () => {
    if (!newGoal.trim() || !user || !activePath) return;
    
    try {
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 3); // Default 3 months

      const { error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          path_id: activePath.id,
          title: newGoal,
          priority: 'medium',
          target_date: targetDate.toISOString().split('T')[0],
          completed: false
        });

      if (error) throw error;

      toast({
        title: "Goal added!",
        description: "Keep pushing towards your future.",
      });
      
      setNewGoal("");
      setGoalDialogOpen(false);
      loadData(); // Reload to show new goal
    } catch (error) {
      console.error('Error adding goal:', error);
      toast({
        title: "Failed to add goal",
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
        {activePath && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-primary mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Active Path</h3>
                  <p className="text-sm text-muted-foreground">{activePath.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

        {/* Goals */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Your Goals</h3>
          {goals.length > 0 ? (
            <div className="space-y-3">
              {goals.map((goal: any) => (
                <Card key={goal.id} className={goal.completed ? 'opacity-60' : ''}>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Target className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {activePath 
                    ? "Goals will be generated when you activate a path"
                    : "Activate a career path to get personalized goals"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

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
          <h3 className="text-lg font-semibold mb-3">Today's Actions</h3>
          <Card>
            <CardContent className="p-4 space-y-3">
              {todayActions.map((action, index) => (
                <div key={index} className="flex items-center gap-3">
                  <button className="flex-shrink-0">
                    {action.done ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm ${action.done ? "line-through text-muted-foreground" : ""}`}>
                      {action.task}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
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
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Quick Tools */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Tools</h3>
          <div className="grid grid-cols-2 gap-3">
            <Drawer open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
              <DrawerTrigger asChild>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Target className="h-5 w-5" />
                  <span className="text-xs">Set Goals</span>
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[80vh]">
                <div className="relative overflow-y-auto">
                  {/* Header */}
                  <div className="text-center pt-8 pb-6 px-6 border-b sticky top-0 bg-background z-10">
                    <h2 className="text-2xl font-bold mb-2">Set Your Goal</h2>
                    <p className="text-sm text-muted-foreground">Define what you want to achieve</p>
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
                    <div className="bg-muted/30 rounded-2xl p-8">
                      <Input
                        placeholder="What do you want to achieve?"
                        value={newGoal}
                        onChange={(e) => setNewGoal(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddGoal()}
                        className="h-14 text-base border-0 bg-background/50"
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="px-6 pb-6 sticky bottom-0 bg-background">
                    <Button 
                      onClick={handleAddGoal}
                      className="w-full h-12 rounded-full text-base font-semibold"
                    >
                      <Target className="h-4 w-4 mr-2" />
                      Add Goal
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
          </div>
        </div>
      </div>
    </div>
  );
};
