import {
  Target,
  CheckCircle2,
  Circle,
  Sparkles,
  MessageSquare,
  Zap,
  Puzzle,
  Award,
  TrendingUp,
  X,
  Map,
  Briefcase,
  Bot,
  Lock,
  BookOpen,
  Users,
  Lightbulb,
  Trophy,
} from "lucide-react";
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
  const [levelResources, setLevelResources] = useState<any[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [resourcesCache, setResourcesCache] = useState<Record<number, any[]>>({});
  const [accordionValue, setAccordionValue] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<any>(null);
  const [logDrawerOpen, setLogDrawerOpen] = useState(false);
  const [actionLog, setActionLog] = useState("");
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [actionHistory, setActionHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [skillGapOpen, setSkillGapOpen] = useState(false);
  const [skillGaps, setSkillGaps] = useState<any[]>([]);
  const [loadingSkillGap, setLoadingSkillGap] = useState(false);
  const [shortcutsContent, setShortcutsContent] = useState<Record<string, string>>({});
  const [loadingShortcuts, setLoadingShortcuts] = useState<Record<string, boolean>>({});
  const [skillGapCache, setSkillGapCache] = useState<Record<string, any>>({});

  const handleGenerateShortcuts = async (action: any) => {
    // Validate required fields
    if (!action.task || !action.suggestions || action.suggestions.length === 0) {
      toast({
        title: "Cannot generate shortcuts",
        description: "This action needs suggestions first.",
        variant: "destructive",
      });
      return;
    }

    const actionKey = `${action.task}-${action.timeframe || "default"}`;
    setLoadingShortcuts((prev) => ({ ...prev, [actionKey]: true }));

    try {
      const session = (await supabase.auth.getSession()).data.session;

      const { data, error } = await supabase.functions.invoke("generate-shortcuts", {
        body: {
          actionTitle: action.task,
          actionDescription: action.label || action.task,
          suggestions: action.suggestions,
          timeframe: action.timeframe || "Not specified",
          priority: action.priority || "medium",
        },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (error) throw error;

      setShortcutsContent((prev) => ({ ...prev, [actionKey]: data.content }));

      toast({
        title: "Shortcuts generated!",
        description: "Check below for the completed homework.",
      });
    } catch (error) {
      console.error("Error generating shortcuts:", error);
      toast({
        title: "Unable to generate shortcuts",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingShortcuts((prev) => ({ ...prev, [actionKey]: false }));
    }
  };

  const guidanceLevels = [
    {
      level: 1,
      name: "Foundation",
      icon: BookOpen,
      description: "Essential skills and core knowledge",
      color: "bg-blue-500",
    },
    {
      level: 2,
      name: "Development",
      icon: Target,
      description: "Intermediate skills and practical experience",
      color: "bg-purple-500",
    },
    {
      level: 3,
      name: "Specialization",
      icon: Lightbulb,
      description: "Advanced expertise in key areas",
      color: "bg-green-500",
    },
    {
      level: 4,
      name: "Leadership",
      icon: Users,
      description: "Team management and strategic thinking",
      color: "bg-orange-500",
    },
    {
      level: 5,
      name: "Innovation",
      icon: Sparkles,
      description: "Creative problem-solving and innovation",
      color: "bg-pink-500",
    },
    {
      level: 6,
      name: "Influence",
      icon: TrendingUp,
      description: "Industry impact and thought leadership",
      color: "bg-indigo-500",
    },
    {
      level: 7,
      name: "Mastery",
      icon: Award,
      description: "Expert-level proficiency and recognition",
      color: "bg-red-500",
    },
    {
      level: 8,
      name: "Mentorship",
      icon: MessageSquare,
      description: "Guide others and build community",
      color: "bg-teal-500",
    },
    {
      level: 9,
      name: "Transformation",
      icon: Zap,
      description: "Drive industry transformation",
      color: "bg-yellow-500",
    },
    {
      level: 10,
      name: "Legacy",
      icon: Trophy,
      description: "Create lasting impact and legacy",
      color: "bg-amber-500",
    },
  ];

  // Always reload when component mounts or user changes
  useEffect(() => {
    loadData();
  }, [user]);

  // Load level resources only when level changes and not cached
  useEffect(() => {
    if (activePath && user && !resourcesCache[currentLevel]) {
      loadLevelResources(currentLevel);
    } else if (resourcesCache[currentLevel]) {
      // Use cached resources
      setLevelResources(resourcesCache[currentLevel]);
    }
  }, [currentLevel, activePath, user]);

  // Clear resource cache when active path changes to force regeneration
  useEffect(() => {
    if (activePath?.id) {
      console.log('Active path changed, clearing resource cache');
      setResourcesCache({});
      setLevelResources([]);
    }
  }, [activePath?.id]);

  // Also reload when page becomes visible (browser tab focus)
  useEffect(() => {
    loadData();

    const handleFocus = () => {
      loadData();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [user]);

  // Auto-refresh actions when date changes
  useEffect(() => {
    if (!user) return;

    const checkDateChange = () => {
      const today = new Date().toISOString().split("T")[0];
      const lastDate = localStorage.getItem("lastActionDate");

      if (lastDate && lastDate !== today) {
        console.log("Date changed, refreshing actions...");
        loadData();
      }

      localStorage.setItem("lastActionDate", today);
    };

    // Check on mount
    checkDateChange();

    // Check every hour
    const interval = setInterval(checkDateChange, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  // Timer effect for meditation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            setTimerActive(false);
            toast({
              title: "Timer Complete! 🎉",
              description: "Great job on your meditation session.",
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch all paths and profile in parallel
      const [profileResult, allPathsResult] = await Promise.all([
        supabase.from("user_profiles").select("active_path_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("career_paths").select("id, title, category").eq("user_id", user.id),
      ]);

      const profile = profileResult.data;
      setAllPaths(allPathsResult.data || []);

      if (profile?.active_path_id) {
        // Get the career path details
        const { data: path } = await supabase
          .from("career_paths")
          .select("*")
          .eq("id", profile.active_path_id)
          .single();

        setActivePath(path);

        // Get goals for this path
        const { data: goalsData } = await supabase
          .from("goals")
          .select("*")
          .eq("user_id", user.id)
          .eq("path_id", profile.active_path_id)
          .order("created_at", { ascending: true });

        // Sort by priority: high first, then medium, then low
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const sortedGoals = (goalsData || []).sort((a, b) => {
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 3;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 3;
          return aPriority - bPriority;
        });

        // Always set goals, even if empty, to clear old path's goals
        setGoals(sortedGoals);

        // Check if we have today's actions already
        const today = new Date().toISOString().split("T")[0];
        const { data: existingActions } = await supabase
          .from("daily_actions")
          .select("*")
          .eq("user_id", user.id)
          .eq("action_date", today)
          .maybeSingle();

        if (existingActions && !existingActions.all_completed) {
          // Use existing actions if they exist and aren't all completed
          setTodayActions(existingActions.actions as any[]);
        } else {
          // Generate new actions if none exist or all previous ones completed
          await generateTodaysActions(path);
        }

        // Load action history (last 7 days, excluding today)
        const { data: historyData } = await supabase
          .from("daily_actions")
          .select("action_date, actions, all_completed")
          .eq("user_id", user.id)
          .neq("action_date", today)
          .order("action_date", { ascending: false })
          .limit(7);

        setActionHistory(historyData || []);
      } else {
        // No active path
        setTodayActions([{ task: "Activate a career path to get started", priority: "low", done: false }]);
      }

      // Get user stats
      let { data: stats } = await supabase.from("user_stats").select("*").eq("user_id", user.id).maybeSingle();

      // Create default stats if they don't exist
      if (!stats) {
        const { data: newStats } = await supabase
          .from("user_stats")
          .insert({
            user_id: user.id,
            current_streak: 0,
            total_points: 0,
            missions_completed: 0,
            paths_explored: 0,
            current_level: 1,
          })
          .select()
          .single();

        stats = newStats;
      }

      setUserStats(stats);
      // Set current level from stats
      if (stats?.current_level) {
        setCurrentLevel(stats.current_level);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadLevelResources = async (level: number, forceRefresh = false) => {
    if (!user) return;

    // Check cache first (unless forcing refresh)
    if (!forceRefresh && resourcesCache[level]) {
      console.log(`Using cached resources for Level ${level}`);
      setLevelResources(resourcesCache[level]);
      return;
    }

    setLoadingResources(true);
    try {
      console.log(`Fetching resources for Level ${level}...`);
      const session = (await supabase.auth.getSession()).data.session;
      const { data, error } = await supabase.functions.invoke("generate-level-resources", {
        body: { level },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (error) {
        console.error("Error loading level resources:", error);
        throw error;
      }

      if (data?.resources && Array.isArray(data.resources)) {
        setLevelResources(data.resources);
        // Cache the resources
        setResourcesCache((prev) => ({ ...prev, [level]: data.resources }));
      } else {
        setLevelResources([]);
      }
    } catch (error) {
      console.error("Failed to load level resources:", error);
      toast({
        title: "Unable to load resources",
        description: "Please try refreshing the page.",
        variant: "destructive",
      });
      setLevelResources([]);
    } finally {
      setLoadingResources(false);
    }
  };

  const generateTodaysActions = async (path?: any) => {
    const activePathData = path || activePath;
    if (!user || !activePathData) return;

    setLoadingActions(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const { data, error } = await supabase.functions.invoke("generate-personalized-guidance", {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (!data?.dailyActions || data.dailyActions.length === 0) {
        throw new Error("No actions generated");
      }

      // Transform the AI-generated actions into the expected format
      const parsedActions = data.dailyActions.map((action: any, idx: number) => {
        let label = "Bonus";
        let priority = "medium";

        if (idx === 0) {
          label = `Morning (${action.timeNeeded || "30min"})`;
          priority = "high";
        } else if (idx === 1) {
          label = `Afternoon (${action.timeNeeded || "1hr"})`;
          priority = "medium";
        } else if (idx === 2) {
          label = `Evening (${action.timeNeeded || "15min"})`;
          priority = "low";
        }

        return {
          task: action.action,
          priority,
          done: false,
          label,
          rationale: action.rationale,
          suggestions: action.suggestions || [],
        };
      });

      setTodayActions(parsedActions);

      // Save to database
      const today = new Date().toISOString().split("T")[0];
      await supabase.from("daily_actions").upsert(
        {
          user_id: user.id,
          path_id: activePathData.id,
          action_date: today,
          actions: parsedActions,
          all_completed: false,
        },
        {
          onConflict: "user_id,action_date",
        },
      );
    } catch (error) {
      console.error("Error generating actions:", error);

      // Check if it's a function invocation error
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.log("Error details:", errorMessage);

      toast({
        title: "Unable to generate actions",
        description: "Our AI is having trouble right now. Please refresh the page.",
        variant: "destructive",
      });

      // Show empty state instead of generic fallback
      setTodayActions([
        {
          task: "AI guidance temporarily unavailable - refresh to try again",
          priority: "medium",
          done: false,
          label: "Status",
        },
      ]);
    } finally {
      setLoadingActions(false);
    }
  };

  const roadmapMilestones = activePath?.roadmap || [];

  const goalsCompleted = goals.filter((g) => g.completed).length;
  const totalGoals = goals.length;

  const quickWinsSuggestions = activePath
    ? [
        `Update LinkedIn with "${activePath.title}" as target role`,
        `Spend 15 minutes researching ${activePath.target_companies?.[0] || "top companies"}`,
        `Watch one tutorial about ${activePath.key_skills?.[0] || "key skills"}`,
        `Connect with one person working as ${activePath.title}`,
        `Read one article about ${activePath.category} careers`,
      ]
    : ["Activate a career path first"];

  const handleSetActivePath = async (pathId: string) => {
    if (!user || pathId === activePath?.id) return;

    setIsTransitioning(true);

    try {
      const { error } = await supabase.from("user_profiles").update({ active_path_id: pathId }).eq("user_id", user.id);

      if (error) throw error;

      // Get the new path data
      const { data: newPath } = await supabase.from("career_paths").select("*").eq("id", pathId).single();

      // Check if the new path has goals
      const { data: existingGoals } = await supabase
        .from("goals")
        .select("id")
        .eq("user_id", user.id)
        .eq("path_id", pathId);

      // If no goals exist, generate them
      if (!existingGoals || existingGoals.length === 0) {
        try {
          const session = (await supabase.auth.getSession()).data.session;
          await supabase.functions.invoke("generate-goals", {
            body: { pathId, userId: user.id },
            headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
          });
        } catch (goalError) {
          console.error("Error generating goals:", goalError);
          // Don't fail the whole operation if goal generation fails
        }
      }

      // Check and award badges after activating path
      await checkAndAwardBadges();

      // Clear level resources cache to force regeneration for new path
      setResourcesCache({});
      
      // Clear skill gaps to force regeneration for new path
      setSkillGaps([]);
      setSkillGapCache({});

      // Reload all data to update with new active path
      await loadData();

      // Force regenerate actions for the new path
      if (newPath) {
        await generateTodaysActions(newPath);
      }

      toast({
        title: "Active path updated",
        description: "Your actions are now personalized to your new path.",
      });

      // Close the accordion
      setAccordionValue("");
    } catch (error) {
      console.error("Error updating active path:", error);
      toast({
        title: "Failed to update path",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleToggleGoal = async (goalId: string, completed: boolean) => {
    try {
      const { error } = await supabase.from("goals").update({ completed: !completed }).eq("id", goalId);

      if (error) throw error;

      // Update local state
      setGoals(goals.map((g) => (g.id === goalId ? { ...g, completed: !completed } : g)));

      if (!completed) {
        toast({
          title: "Goal completed!",
          description: "Great progress on your journey.",
        });
      }
    } catch (error) {
      console.error("Error toggling goal:", error);
    }
  };

  const loadSkillGap = async (forceRefresh = false) => {
    if (!user || !activePath) return;

    const cacheKey = `${activePath.id}_level_${currentLevel}`;
    
    // Check cache first unless force refresh
    if (!forceRefresh && skillGapCache[cacheKey]) {
      setSkillGaps(skillGapCache[cacheKey]);
      return;
    }

    setLoadingSkillGap(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const { data, error } = await supabase.functions.invoke("generate-skill-gap", {
        body: {
          level: currentLevel,
          pathTitle: activePath.title,
          keySkills: activePath.key_skills || [],
          roadmap: activePath.roadmap || [],
        },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (error) throw error;

      if (data?.skillGaps) {
        setSkillGaps(data.skillGaps);
        setSkillGapCache((prev) => ({ ...prev, [cacheKey]: data.skillGaps }));
      }
    } catch (error) {
      console.error("Error loading skill gap:", error);
      toast({
        title: "Unable to load skill gap",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingSkillGap(false);
    }
  };

  const handleLevelComplete = async () => {
    if (!user || !userStats) return;

    const nextLevel = currentLevel + 1;

    // Check if can level up
    if (nextLevel > 10) {
      toast({
        title: "🎊 All Levels Completed!",
        description: "Congratulations! You've mastered all levels of your journey!",
      });
      await checkAndAwardBadges();
      return;
    }

    try {
      // Update level in database
      const { error } = await supabase.from("user_stats").update({ current_level: nextLevel }).eq("user_id", user.id);

      if (error) throw error;

      // Update local state
      setCurrentLevel(nextLevel);
      setUserStats({ ...userStats, current_level: nextLevel });

      // Clear cache and generate new content
      setResourcesCache((prev) => {
        const newCache = { ...prev };
        delete newCache[nextLevel];
        return newCache;
      });

      toast({
        title: `🎉 Level ${nextLevel} Unlocked!`,
        description: `Congratulations! You've advanced to ${guidanceLevels[nextLevel - 1]?.name || "the next level"}. New resources and actions await!`,
      });

      // Clear skill gap cache for new level
      setSkillGapCache({});
      setSkillGaps([]);

      // Award badge
      await checkAndAwardBadges();

      // Generate new actions for the new level
      await generateTodaysActions();
    } catch (error) {
      console.error("Error leveling up:", error);
      toast({
        title: "Error",
        description: "Failed to advance level. Please try again.",
        variant: "destructive",
      });
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
      const allCompleted = updatedActions.every((action) => action.done);

      // Save to database
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase.from("daily_actions").upsert(
        {
          user_id: user.id,
          path_id: activePath.id,
          action_date: today,
          actions: updatedActions,
          all_completed: allCompleted,
        },
        {
          onConflict: "user_id,action_date",
        },
      );

      if (error) throw error;

      if (!updatedActions[index].done) {
        toast({
          title: "Action reopened",
          description: "Keep working on this task",
        });
      } else {
        // Check if level completed
        if (allCompleted) {
          await handleLevelComplete();
        } else {
          toast({
            title: "Action completed! 🎉",
            description: "Great progress!",
          });
        }
      }
    } catch (error) {
      console.error("Error toggling action:", error);
      toast({
        title: "Error",
        description: "Failed to update action",
        variant: "destructive",
      });
    }
  };

  const handleActionClick = (action: any, index: number) => {
    if (action.done) return; // Don't open for completed actions
    setSelectedAction({ ...action, index });
    setActionLog("");
    setTimerSeconds(0);
    setTimerActive(false);
    setLogDrawerOpen(true);
  };

  const handleSaveLog = async () => {
    if (!user || !activePath || !selectedAction) return;

    try {
      // Mark action as complete with log
      const updatedActions = [...todayActions];
      updatedActions[selectedAction.index] = {
        ...updatedActions[selectedAction.index],
        done: true,
        log: actionLog,
        completedAt: new Date().toISOString(),
      };
      setTodayActions(updatedActions);

      // Save to database
      const today = new Date().toISOString().split("T")[0];
      const allCompleted = updatedActions.every((action) => action.done);

      await supabase.from("daily_actions").upsert(
        {
          user_id: user.id,
          path_id: activePath.id,
          action_date: today,
          actions: updatedActions,
          all_completed: allCompleted,
        },
        {
          onConflict: "user_id,action_date",
        },
      );

      toast({
        title: "Action logged! 🎯",
        description: "Keep up the great work!",
      });

      setLogDrawerOpen(false);

      if (allCompleted) {
        await handleLevelComplete();
      }
    } catch (error) {
      console.error("Error saving log:", error);
      toast({
        title: "Error",
        description: "Failed to save action log",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isMeditationAction = (task: string) => {
    const meditationKeywords = ["meditat", "visualiz", "mindful", "breath", "relax"];
    return meditationKeywords.some((keyword) => task.toLowerCase().includes(keyword));
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
      <div
        className={`max-w-md mx-auto space-y-6 transition-opacity duration-300 ${isTransitioning ? "opacity-50" : "opacity-100"}`}
      >
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
          <Accordion
            type="single"
            collapsible
            className="w-full"
            value={accordionValue}
            onValueChange={setAccordionValue}
          >
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
                            ? "bg-primary/10 text-primary cursor-default"
                            : "hover:bg-muted/50 text-foreground hover:scale-[1.01]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{path.title}</p>
                            {path.category && <p className="text-xs text-muted-foreground mt-0.5">{path.category}</p>}
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
              const isUnlocked = level.level <= currentLevel;
              return (
                <div
                  key={level.level}
                  className={`relative aspect-square rounded-lg ${
                    isUnlocked ? level.color + " text-white" : "bg-muted/50 text-muted-foreground"
                  } flex flex-col items-center justify-center p-2 ${
                    isUnlocked ? "cursor-pointer hover:opacity-90" : "cursor-not-allowed"
                  }`}
                  onClick={() => isUnlocked && setCurrentLevel(level.level)}
                >
                  {!isUnlocked && <Lock className="h-3 w-3 absolute top-1 right-1" />}
                  <Icon className="h-4 w-4 mb-1" />
                  <span className="text-[10px] font-medium text-center leading-tight">{level.level}</span>
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
                    <Badge variant="secondary" className="text-xs">
                      Active
                    </Badge>
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
              <div className="text-2xl font-bold">
                {goalsCompleted}/{totalGoals || "0"}
              </div>
              <div className="text-xs text-muted-foreground">Goals</div>
            </CardContent>
          </Card>
        </div>

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

        {/* Goals Section - Make it prominent */}
        {goals.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Your Goals</h3>
              <Badge variant="secondary">
                {goalsCompleted} of {totalGoals} completed
              </Badge>
            </div>
            <div className="space-y-2">
              {goals.slice(0, 3).map((goal: any) => (
                <Card key={goal.id} className={goal.completed ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button onClick={() => handleToggleGoal(goal.id, goal.completed)} className="mt-1 flex-shrink-0">
                        {goal.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1">
                        <h4 className={`font-medium text-sm mb-1 ${goal.completed ? "line-through" : ""}`}>
                          {goal.title}
                        </h4>
                        {goal.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{goal.description}</p>
                        )}
                        {goal.target_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
                <Button variant="outline" className="w-full" onClick={() => setGoalDialogOpen(true)}>
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

        {/* Today's Actions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Today's Actions</h3>
            <div className="flex items-center gap-2">
              {actionHistory.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)} className="h-7 text-xs">
                  {showHistory ? "Hide History" : "History"}
                </Button>
              )}
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
                <Card
                  key={index}
                  className={`${action.done ? "opacity-60" : "cursor-pointer hover:border-primary/50 transition-all"}`}
                  onClick={() => !action.done && handleActionClick(action, index)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAction(index);
                        }}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {action.done ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {action.timeframe && (
                            <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                              action.timeframe === "morning" 
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : action.timeframe === "afternoon"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                  : action.timeframe === "evening"
                                    ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                                    : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            }`}>
                              {action.timeframe}
                            </span>
                          )}
                          {action.label && (
                            <span className="text-xs text-muted-foreground">{action.label}</span>
                          )}
                          {action.priority && (
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
                          )}
                        </div>
                        <p className={`text-sm text-foreground leading-relaxed ${action.done ? "line-through" : ""}`}>
                          {action.task}
                        </p>
                        {!action.done && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <p className="text-[10px] text-muted-foreground whitespace-nowrap">Tap to log action</p>
                            {action.suggestions && action.suggestions.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const actionElement = e.currentTarget.parentElement?.parentElement?.parentElement;
                                    const suggestionsDiv = actionElement?.querySelector(".suggestions-content");
                                    if (suggestionsDiv) {
                                      suggestionsDiv.classList.toggle("hidden");
                                    }
                                  }}
                                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium whitespace-nowrap"
                                >
                                  💡 what to do
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleGenerateShortcuts(action);
                                  }}
                                  disabled={loadingShortcuts[`${action.task}-${action.timeframe || "default"}`]}
                                  className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary/80 text-secondary-foreground hover:bg-secondary transition-colors font-medium disabled:opacity-50 whitespace-nowrap"
                                >
                                  {loadingShortcuts[`${action.task}-${action.timeframe || "default"}`] ? "⏳" : "⚡"}{" "}
                                  cliffs notes
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {action.suggestions && action.suggestions.length > 0 && !action.done && (
                          <div className="suggestions-content hidden mt-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                            <ul className="space-y-1.5">
                              {action.suggestions.map((suggestion: any, idx: number) => {
                                const suggestionText =
                                  typeof suggestion === "string"
                                    ? suggestion
                                    : suggestion.person
                                      ? `${suggestion.person} - ${suggestion.title} at ${suggestion.organization}${suggestion.message ? `: "${suggestion.message}"` : ""}`
                                      : JSON.stringify(suggestion);

                                return (
                                  <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                                    <span className="text-primary mt-0.5">•</span>
                                    <span>{suggestionText}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                        {shortcutsContent[`${action.task}-${action.timeframe || "default"}`] && !action.done && (
                          <div className="mt-2 p-4 rounded-lg bg-accent/30 border border-accent">
                            <div className="flex items-center gap-2 mb-2">
                              <Zap className="h-4 w-4 text-accent-foreground" />
                              <h4 className="text-sm font-semibold text-accent-foreground">Completed Homework</h4>
                            </div>
                            <div
                              className="text-xs text-accent-foreground/90 prose prose-sm max-w-none"
                              dangerouslySetInnerHTML={{
                                __html: shortcutsContent[`${action.task}-${action.timeframe || "default"}`]
                                  .replace(/\n/g, "<br />")
                                  .replace(/##\s+(.+)/g, "<strong>$1</strong>")
                                  .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                                  .replace(/\*(.+?)\*/g, "<em>$1</em>"),
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Action History */}
          {showHistory && actionHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t space-y-2">
              <p className="text-xs text-muted-foreground mb-3">Previous Days</p>
              {actionHistory.map((historyItem) => {
                const date = new Date(historyItem.action_date);
                const completedCount = (historyItem.actions as any[]).filter((a) => a.done).length;
                const totalCount = (historyItem.actions as any[]).length;

                return (
                  <Card key={historyItem.action_date} className="border-muted/30">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium">
                          {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <Badge variant={historyItem.all_completed ? "default" : "outline"} className="text-xs h-5">
                          {completedCount}/{totalCount}
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        {(historyItem.actions as any[]).map((action, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs">
                            {action.done ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Circle className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            )}
                            <p
                              className={`text-muted-foreground leading-relaxed ${action.done ? "line-through opacity-60" : ""}`}
                            >
                              {action.task}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Affirmations */}
        {activePath && activePath.affirmations?.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Daily Affirmations</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    const session = (await supabase.auth.getSession()).data.session;
                    const { data, error } = await supabase.functions.invoke("generate-affirmations", {
                      body: { pathId: activePath.id },
                      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
                    });

                    if (error) throw error;

                    if (data?.affirmations) {
                      setActivePath({ ...activePath, affirmations: data.affirmations });
                      toast({
                        title: "Affirmations refreshed",
                        description: "Your daily affirmations have been updated.",
                      });
                    }
                  } catch (error) {
                    console.error("Error refreshing affirmations:", error);
                    toast({
                      title: "Failed to refresh",
                      description: "Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
                className="h-7 text-xs"
              >
                Refresh
              </Button>
            </div>
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

        {/* Level Resources */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Level {currentLevel} Resources</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Foundation</span>
              {activePath && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setResourcesCache((prev) => {
                      const newCache = { ...prev };
                      delete newCache[currentLevel];
                      return newCache;
                    });
                    // Force refresh to generate new resources
                    loadLevelResources(currentLevel, true);
                  }}
                  disabled={loadingResources}
                  className="h-7 text-xs"
                >
                  {loadingResources ? "Refreshing..." : "Refresh"}
                </Button>
              )}
            </div>
          </div>

          {loadingResources ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : !activePath ? (
            <Card className="border-dashed">
              <CardContent className="p-6 text-center">
                <BookOpen className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Activate a career path to get personalized learning resources
                </p>
              </CardContent>
            </Card>
          ) : levelResources.length === 0 ? (
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-6 text-center">
                <BookOpen className="h-8 w-8 mx-auto mb-3 text-amber-500" />
                <p className="text-sm text-muted-foreground mb-3">
                  Generating personalized resources based on your CV and skill gaps...
                </p>
                <Button size="sm" variant="outline" onClick={() => loadLevelResources(currentLevel)}>
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {levelResources.map((resource: any, index: number) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <BookOpen className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm mb-1">{resource.resource}</h4>
                        <p className="text-xs text-muted-foreground mb-2">{resource.impact}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Award className="h-3 w-3" />
                            {resource.commitment}
                          </span>
                        </div>
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
            <Drawer
              open={skillGapOpen}
              onOpenChange={(open) => {
                setSkillGapOpen(open);
                if (open && skillGaps.length === 0) {
                  loadSkillGap();
                }
              }}
            >
              <DrawerTrigger asChild>
                <Button variant="outline" className="h-20 flex flex-col gap-2">
                  <Puzzle className="h-5 w-5" />
                  <span className="text-xs">Skill Gap</span>
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[80vh] fixed">
                {/* Close Button - Fixed position outside scroll container */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 rounded-full z-50 pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSkillGapOpen(false);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>

                <div className="overflow-y-auto max-h-[calc(80vh-2rem)]">
                  {/* Header */}
                  <div className="text-center pt-8 pb-6 px-6 border-b sticky top-0 bg-background z-10">
                    <h2 className="text-2xl font-bold mb-2">Your Skill Gap</h2>
                    <p className="text-sm text-muted-foreground mb-3">Level {currentLevel} focus areas</p>
                    {activePath && skillGaps.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadSkillGap(true)}
                        disabled={loadingSkillGap}
                        className="h-7 text-xs"
                      >
                        {loadingSkillGap ? "Refreshing..." : "Refresh"}
                      </Button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    {loadingSkillGap ? (
                      <div className="space-y-3">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                      </div>
                    ) : skillGaps.length > 0 ? (
                      <div className="space-y-4">
                        {skillGaps.map((gap, idx) => (
                          <Card key={idx} className="border-primary/20">
                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-start gap-2">
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-primary">{idx + 1}</span>
                                </div>
                                <h4 className="font-semibold text-sm flex-1">{gap.skill}</h4>
                              </div>

                              <div className="space-y-2 text-xs">
                                <div>
                                  <p className="font-medium text-muted-foreground mb-1">Gap:</p>
                                  <p className="text-foreground/90">{gap.gap}</p>
                                </div>

                                <div>
                                  <p className="font-medium text-muted-foreground mb-1">How to fill it:</p>
                                  <p className="text-foreground/90">{gap.howToFill}</p>
                                </div>

                                <div className="pt-2 border-t border-border/50">
                                  <p className="text-primary/80 italic">{gap.whyItMatters}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">Activate a path to see your skill gap analysis</p>
                      </div>
                    )}
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
              <DrawerContent className="max-h-[80vh] fixed">
                {/* Close Button - Fixed position outside scroll container */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 rounded-full z-50 pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuickWinsOpen(false);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>

                <div className="overflow-y-auto max-h-[calc(80vh-2rem)]">
                  {/* Header */}
                  <div className="text-center pt-8 pb-6 px-6 border-b sticky top-0 bg-background z-10">
                    <h2 className="text-2xl font-bold mb-2">Quick Wins</h2>
                    <p className="text-sm text-muted-foreground">Small actions, big impact on your journey</p>
                  </div>

                  {/* Content Card */}
                  <div className="p-6">
                    <div className="bg-muted/30 rounded-2xl p-6 space-y-3">
                      {quickWinsSuggestions.map((win, idx) => (
                        <div
                          key={idx}
                          className="w-full text-left p-4 rounded-xl bg-background/50"
                        >
                          <div className="flex items-start gap-3">
                            <Zap className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-sm leading-relaxed">{win}</span>
                          </div>
                        </div>
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
              <span className="text-xs">Jobs For You (soon)</span>
            </Button>

            <Button variant="outline" className="h-20 flex flex-col gap-2" disabled>
              <Bot className="h-5 w-5" />
              <span className="text-xs">Automations (soon)</span>
            </Button>
          </div>
        </div>
      </div>

      {/* All Goals Drawer */}
      <Drawer open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DrawerContent className="max-h-[85vh]">
          <div className="relative overflow-y-auto">
            {/* Header */}
            <div className="text-center pt-8 pb-6 px-6 border-b sticky top-0 bg-background z-10">
              <h2 className="text-2xl font-bold mb-2">All Your Goals</h2>
              <p className="text-sm text-muted-foreground">
                {goalsCompleted} of {totalGoals} completed
              </p>
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

            {/* Content */}
            <div className="p-6 space-y-2">
              {goals.map((goal: any) => (
                <Card key={goal.id} className={goal.completed ? "opacity-60" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button onClick={() => handleToggleGoal(goal.id, goal.completed)} className="mt-1 flex-shrink-0">
                        {goal.completed ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        )}
                      </button>
                      <div className="flex-1">
                        <h4 className={`font-medium text-sm mb-1 ${goal.completed ? "line-through" : ""}`}>
                          {goal.title}
                        </h4>
                        {goal.description && <p className="text-xs text-muted-foreground">{goal.description}</p>}
                        {goal.target_date && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(goal.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Mission Log Drawer */}
      <Drawer open={logDrawerOpen} onOpenChange={setLogDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <div className="relative overflow-y-auto">
            {/* Header */}
            <div className="text-center pt-8 pb-6 px-6 border-b sticky top-0 bg-background z-10">
              <h2 className="text-2xl font-bold mb-2">Log Action</h2>
              <p className="text-sm text-muted-foreground">{selectedAction?.task}</p>
            </div>

            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 rounded-full z-20"
              onClick={() => setLogDrawerOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Timer for meditation */}
              {selectedAction && isMeditationAction(selectedAction.task) && (
                <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-6">
                  <div className="text-center space-y-4">
                    <div className="text-6xl font-light tracking-tight">{formatTime(timerSeconds)}</div>
                    <div className="flex gap-2 justify-center">
                      {!timerActive ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTimerSeconds(300)}
                            disabled={timerActive}
                          >
                            5 min
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTimerSeconds(600)}
                            disabled={timerActive}
                          >
                            10 min
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTimerSeconds(900)}
                            disabled={timerActive}
                          >
                            15 min
                          </Button>
                        </>
                      ) : null}
                    </div>
                    <Button
                      onClick={() => {
                        if (timerSeconds > 0) {
                          setTimerActive(!timerActive);
                        }
                      }}
                      disabled={timerSeconds === 0}
                      className="w-full h-12 rounded-full"
                      variant={timerActive ? "outline" : "default"}
                    >
                      {timerActive ? "Pause" : timerSeconds > 0 ? "Start" : "Select Duration"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Log Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  How did it go? <span className="text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  value={actionLog}
                  onChange={(e) => {
                    if (e.target.value.length <= 140) {
                      setActionLog(e.target.value);
                    }
                  }}
                  placeholder="Share your thoughts, learnings, or wins..."
                  className="w-full h-24 px-4 py-3 rounded-xl border border-border bg-background/50 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm"
                />
                <div className="text-xs text-right text-muted-foreground">{actionLog.length}/140</div>
              </div>
            </div>

            {/* Action Button */}
            <div className="px-6 pb-6 sticky bottom-0 bg-background">
              <Button onClick={handleSaveLog} className="w-full h-12 rounded-full text-base font-semibold">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Complete Action
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <BadgeCelebration badge={newlyAwardedBadge} onComplete={clearCelebration} />
    </div>
  );
};
