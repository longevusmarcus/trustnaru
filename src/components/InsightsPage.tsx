import { useEffect, useState, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { TrendingUp, Target, Award, Lightbulb, Send, ChevronDown, CheckCircle2, Sparkles, Puzzle, Zap, X, Briefcase, Bot } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { checkAndAwardBadges } from "@/lib/badgeUtils";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";

// Format message content: properly parse markdown and create natural formatting
const formatMessageContent = (content: string) => {
  const lines = content.split("\n");
  const elements: JSX.Element[] = [];
  let currentList: string[] = [];
  let listType: "bullet" | "number" | null = null;

  const flushList = () => {
    if (currentList.length > 0) {
      const ListTag = listType === "number" ? "ol" : "ul";
      elements.push(
        <ListTag
          key={elements.length}
          className={`ml-3 my-1.5 space-y-0.5 ${listType === "bullet" ? "list-none" : "list-decimal"}`}
        >
          {currentList.map((item, i) => (
            <li key={i} className="text-[13px] leading-snug flex items-start">
              {listType === "bullet" && <span className="text-muted-foreground mr-2 mt-0.5">•</span>}
              <span>{item}</span>
            </li>
          ))}
        </ListTag>,
      );
      currentList = [];
      listType = null;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    // Handle headings (###, ##, #)
    if (trimmed.startsWith("###")) {
      flushList();
      elements.push(
        <h4 key={elements.length} className="font-semibold text-[14px] mt-3 mb-1">
          {trimmed.replace(/^###\s*/, "")}
        </h4>,
      );
    } else if (trimmed.startsWith("##")) {
      flushList();
      elements.push(
        <h3 key={elements.length} className="font-semibold text-[15px] mt-3 mb-1">
          {trimmed.replace(/^##\s*/, "")}
        </h3>,
      );
    } else if (trimmed.startsWith("#")) {
      flushList();
      elements.push(
        <h2 key={elements.length} className="font-semibold text-base mt-3 mb-1">
          {trimmed.replace(/^#\s*/, "")}
        </h2>,
      );
    }
    // Handle numbered lists (1. item or 1) item)
    else if (/^\d+[\.)]\s/.test(trimmed)) {
      if (listType !== "number") flushList();
      listType = "number";
      const text = trimmed.replace(/^\d+[\.)]\s*/, "").replace(/\*\*(.+?)\*\*/g, "$1");
      currentList.push(text);
    }
    // Handle bullet points
    else if (trimmed.startsWith("*") && !trimmed.startsWith("**")) {
      if (listType !== "bullet") flushList();
      listType = "bullet";
      const text = trimmed.replace(/^\*\s*/, "").replace(/\*\*(.+?)\*\*/g, "$1");
      currentList.push(text);
    }
    // Handle implicit list items: lines starting with capital and early colon (like "Item title: description")
    else if (/^[A-Z]/.test(trimmed) && /^[^:]{3,50}:/.test(trimmed)) {
      if (listType !== "bullet") flushList();
      listType = "bullet";
      const text = trimmed.replace(/\*\*(.+?)\*\*/g, "$1");
      currentList.push(text);
    }
    // Handle regular paragraphs
    else {
      flushList();
      // Remove bold markdown and just use regular text
      const cleanText = trimmed.replace(/\*\*(.+?)\*\*/g, "$1");
      if (cleanText) {
        elements.push(
          <p key={elements.length} className="text-[13px] leading-relaxed mb-2">
            {cleanText}
          </p>,
        );
      }
    }
  });

  flushList();
  return elements;
};

export const InsightsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activePath, setActivePath] = useState<any>(null);
  const [allPaths, setAllPaths] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [goals, setGoals] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasInitialMessage, setHasInitialMessage] = useState(false);
  const [personalizedGuidance, setPersonalizedGuidance] = useState<any>(null);
  const [loadingGuidance, setLoadingGuidance] = useState(false);
  const [guidanceError, setGuidanceError] = useState<string | null>(null);
  const [guidanceCache, setGuidanceCache] = useState<Record<number, any>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [skillGapOpen, setSkillGapOpen] = useState(false);
  const [quickWinsOpen, setQuickWinsOpen] = useState(false);
  const [skillGaps, setSkillGaps] = useState<any[]>([]);
  const [loadingSkillGap, setLoadingSkillGap] = useState(false);
  const [skillGapCache, setSkillGapCache] = useState<Record<string, any>>({});

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isGenerating]);

  // Load insights only on mount or when user changes
  useEffect(() => {
    loadInsights();
  }, [user?.id]);

  // Load guidance only when level changes and not cached
  useEffect(() => {
    const currentLevel = userStats?.current_level || 1;
    if (activePath && user && !guidanceCache[currentLevel]) {
      setTimeout(() => {
        loadPersonalizedGuidance(activePath, 1, currentLevel);
      }, 800);
    } else if (guidanceCache[currentLevel]) {
      // Use cached guidance
      setPersonalizedGuidance(guidanceCache[currentLevel]);
    }
  }, [userStats?.current_level, activePath?.id, user]);

  const loadInsights = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch profile and base data in parallel
      const [profileResult, statsResult, allPathsResult] = await Promise.all([
        supabase.from("user_profiles").select("active_path_id, display_name").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("user_stats")
          .select("current_streak, missions_completed, current_level, total_points")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.from("career_paths").select("id, title, category").eq("user_id", user.id),
      ]);

      const profile = profileResult.data;
      const userName = profile?.display_name || user.email?.split("@")[0] || "there";
      const stats = statsResult.data || { current_streak: 0, missions_completed: 0, current_level: 1, total_points: 0 };

      // Fetch active path and goals in parallel if active path exists
      let activePathData = null;
      let goalsData: any[] = [];
      if (profile?.active_path_id) {
        const [pathResult, goalsResult] = await Promise.all([
          supabase
            .from("career_paths")
            .select("id, title, category, key_skills, target_companies")
            .eq("id", profile.active_path_id)
            .single(),
          supabase
            .from("goals")
            .select("*")
            .eq("user_id", user.id)
            .eq("path_id", profile.active_path_id)
            .order("priority", { ascending: true }),
        ]);
        activePathData = pathResult.data;
        goalsData = goalsResult.data || [];
      }

      setActivePath(activePathData);
      setAllPaths(allPathsResult.data || []);
      setUserStats(stats);
      setGoals(goalsData);

      // Set welcome message and auto-generate today's actions if path is active
      const welcomeMsg = activePathData
        ? `Hey ${userName}! 👋 You're on Level ${stats.current_level || 1}. I can help you with insights about ${activePathData.title}, analyze market trends, or dive into your CV and journey. What would you like to explore?`
        : `Hey ${userName}! 👋 Activate a career path to get personalized insights and market analysis tailored to your journey.`;

      setChatMessages([{ role: "assistant", content: welcomeMsg }]);
      setHasInitialMessage(true);

      if (activePathData) {
        setTimeout(() => {
          generateTodaysActions();
        }, 800);
      }
    } catch (error) {
      console.error("Error loading insights:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetActivePath = async (pathId: string) => {
    if (!user || pathId === activePath?.id) return;

    try {
      const { error } = await supabase.from("user_profiles").update({ active_path_id: pathId }).eq("user_id", user.id);

      if (error) throw error;

      // Check and award badges after activating path
      await checkAndAwardBadges(user.id);

      // Clear guidance cache when switching paths
      setGuidanceCache({});
      
      // Clear skill gap cache when switching paths
      setSkillGapCache({});
      setSkillGaps([]);
      
      // Clear localStorage caches for skill gaps
      if (activePath) {
        const currentLevel = userStats?.current_level || 1;
        const storageCacheKey = `skill_gap_${user.id}_${activePath.id}_level_${currentLevel}`;
        localStorage.removeItem(storageCacheKey);
      }

      // Reload insights to update with new active path
      await loadInsights();

      toast({
        title: "Active path updated",
        description: "Your insights are now personalized to your new path.",
      });
    } catch (error) {
      console.error("Error updating active path:", error);
      toast({
        title: "Failed to update path",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const loadPersonalizedGuidance = async (pathArg?: any, attempt: number = 1, level?: number) => {
    const activePathData = pathArg || activePath;
    const currentLevel = level || userStats?.current_level || 1;

    if (!user || !activePathData) {
      setPersonalizedGuidance({ dailyActions: [], smartTips: [], levelResources: [] });
      setGuidanceError("Please activate a path to get smart tips.");
      setLoadingGuidance(false);
      return;
    }

    // Check cache first
    if (guidanceCache[currentLevel]) {
      console.log(`Using cached guidance for Level ${currentLevel}`);
      setPersonalizedGuidance(guidanceCache[currentLevel]);
      return;
    }

    setLoadingGuidance(true);
    setGuidanceError(null);
    try {
      console.log(`Fetching guidance for Level ${currentLevel}...`);
      const session = (await supabase.auth.getSession()).data.session;
      const { data, error } = await supabase.functions.invoke("generate-personalized-guidance", {
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (error) throw error;

      const hasAny = Boolean(
        (data?.dailyActions && data.dailyActions.length) ||
          (data?.smartTips && data.smartTips.length) ||
          (data?.levelResources && data.levelResources.length),
      );

      if (!hasAny && attempt === 1) {
        // Auto-retry once to avoid cold-start or transient empty payloads
        setTimeout(() => loadPersonalizedGuidance(activePathData, 2, currentLevel), 900);
        return;
      }

      const guidanceData = data || { dailyActions: [], smartTips: [], levelResources: [] };
      setPersonalizedGuidance(guidanceData);
      // Cache the guidance
      setGuidanceCache((prev) => ({ ...prev, [currentLevel]: guidanceData }));
      setGuidanceError(hasAny ? null : "No guidance returned");
    } catch (error) {
      if (attempt === 1) {
        // Auto-retry once on error
        setTimeout(() => loadPersonalizedGuidance(activePathData, 2, currentLevel), 900);
        return;
      }
      console.error("Error loading personalized guidance:", error);
      setPersonalizedGuidance({ dailyActions: [], smartTips: [], levelResources: [] });
      setGuidanceError(error instanceof Error ? error.message : "Unknown error");
      toast({
        title: "Unable to load guidance",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingGuidance(false);
    }
  };

  const generateTodaysActions = async () => {
    if (!user || !activePath) return;

    setIsGenerating(true);
    const actionPrompt = `Based on my CV experience, career aspirations, and current path (${activePath.title}), give me 3 practical actions for today: a 30-min morning skill-building activity, a 1-hour afternoon networking/research task, and a 15-min evening reflection. Be specific and actionable.`;

    try {
      const { data, error } = await supabase.functions.invoke("generate-insights", {
        body: { message: actionPrompt },
      });

      if (error) throw error;
      if (!data?.insight) throw new Error("No insight received");

      setChatMessages((prev) => [
        ...prev,
        { role: "user", content: "What are my actions for today?" },
        { role: "assistant", content: data.insight },
      ]);
    } catch (error) {
      console.error("Error generating actions:", error);
      toast({
        title: "Unable to generate actions",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const loadSkillGap = async (forceRefresh = false) => {
    if (!user || !activePath) return;

    const currentLevel = userStats?.current_level || 1;
    const cacheKey = `${activePath.id}_level_${currentLevel}`;
    
    // Check localStorage cache first (date-based)
    const today = new Date().toISOString().split("T")[0];
    const storageCacheKey = `skill_gap_${user.id}_${activePath.id}_level_${currentLevel}`;
    
    if (!forceRefresh) {
      const cached = localStorage.getItem(storageCacheKey);
      if (cached) {
        try {
          const { data, date } = JSON.parse(cached);
          if (date === today && data) {
            console.log(`Using cached skill gaps from ${date}`);
            setSkillGaps(data);
            setSkillGapCache((prev) => ({ ...prev, [cacheKey]: data }));
            return;
          }
        } catch (e) {
          console.error("Error parsing cached skill gaps:", e);
        }
      }
      
      // Check memory cache
      if (skillGapCache[cacheKey]) {
        setSkillGaps(skillGapCache[cacheKey]);
        return;
      }
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
        
        // Save to localStorage with today's date
        const today = new Date().toISOString().split("T")[0];
        localStorage.setItem(storageCacheKey, JSON.stringify({ data: data.skillGaps, date: today }));
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

  const handleSendMessage = async () => {
    const messageToSend = inputMessage.trim();
    if (!messageToSend || isGenerating) return;

    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in",
        variant: "destructive",
      });
      return;
    }

    setInputMessage("");
    setChatMessages((prev) => [...prev, { role: "user", content: messageToSend }]);
    setIsGenerating(true);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const { data, error } = await supabase.functions.invoke("generate-insights", {
        body: { message: messageToSend },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (error) {
        console.error("Function error:", error);
        throw error;
      }

      if (!data?.insight) {
        throw new Error("No insight received");
      }

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.insight,
        },
      ]);
    } catch (error) {
      console.error("Error generating insight:", error);
      setChatMessages((prev) => prev.slice(0, -1)); // Remove user message on error
      toast({
        title: "Unable to generate insight",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Memoize calculated insights
  const pathCategories = useMemo(() => [...new Set(allPaths.map((p) => p.category).filter(Boolean))], [allPaths]);

  const progressPercentage = useMemo(
    () => (activePath ? Math.min(33, (userStats?.missions_completed || 0) * 10) : 0),
    [activePath, userStats?.missions_completed],
  );

  const quickWinsSuggestions = activePath
    ? [
        `Update LinkedIn with "${activePath.title}" as target role`,
        `Spend 15 minutes researching ${activePath.target_companies?.[0] || "top companies"}`,
        `Watch one tutorial about ${activePath.key_skills?.[0] || "key skills"}`,
        `Connect with one person working as ${activePath.title}`,
        `Read one article about ${activePath.category} careers`,
      ]
    : ["Activate a career path first"];

  const personalizedTips = useMemo(() => {
    if (loadingGuidance) {
      return []; // Show loading state instead
    }
    if (personalizedGuidance?.smartTips?.length) {
      return personalizedGuidance.smartTips;
    }
    if (!activePath) {
      return [];
    }
    // Return empty while loading to show skeleton
    return [];
  }, [activePath, personalizedGuidance, loadingGuidance]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-md mx-auto px-4 pt-6 space-y-6 pb-8">
        {/* Progress Overview */}
        {activePath && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Active Path</h3>
                    <p className="text-sm text-muted-foreground">{activePath.title}</p>
                    {activePath.category && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                        {activePath.category}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Journey Progress</span>
                    <span className="font-medium">
                      {progressPercentage}% • Level {userStats?.current_level || 1}/10
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Key Metrics */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="text-lg font-semibold mb-3">Your Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="h-5 w-5 mx-auto mb-2 text-primary/70" />
                <div className="text-2xl font-bold">{userStats?.missions_completed || 0}</div>
                <div className="text-xs text-muted-foreground">Actions Completed</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="h-5 w-5 mx-auto mb-2 text-primary/70" />
                <div className="text-2xl font-bold">
                  {goals.filter((g) => g.completed).length}/{goals.length || 0}
                </div>
                <div className="text-xs text-muted-foreground">Goals</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Sparkles className="h-5 w-5 mx-auto mb-2 text-primary/70" />
                <div className="text-2xl font-bold">{userStats?.total_points || 0}</div>
                <div className="text-xs text-muted-foreground">Points</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary/70" />
                <div className="text-2xl font-bold">{allPaths.length}</div>
                <div className="text-xs text-muted-foreground">Paths Generated</div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Path Diversity */}
        {pathCategories.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Award className="h-5 w-5 text-primary/70" />
                  <h4 className="font-medium">Career Diversity</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  You're exploring {pathCategories.length} different career direction
                  {pathCategories.length !== 1 ? "s" : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {pathCategories.map((category, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tools Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
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
                  <div className="text-center pt-8 pb-6 px-6 border-b sticky top-0 bg-background z-10">
                    <h2 className="text-2xl font-bold mb-2">Your Skill Gap</h2>
                    <p className="text-sm text-muted-foreground mb-3">Level {userStats?.current_level || 1} focus areas</p>
                    {activePath && skillGaps.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Clear both memory and localStorage cache
                          if (user && activePath) {
                            const currentLevel = userStats?.current_level || 1;
                            const storageCacheKey = `skill_gap_${user.id}_${activePath.id}_level_${currentLevel}`;
                            localStorage.removeItem(storageCacheKey);
                          }
                          loadSkillGap(true);
                        }}
                        disabled={loadingSkillGap}
                        className="h-7 text-xs"
                      >
                        {loadingSkillGap ? "Refreshing..." : "Refresh"}
                      </Button>
                    )}
                  </div>

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
                                  <p className="font-medium text-muted-foreground mb-1">Why it matters:</p>
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
                  <div className="text-center pt-8 pb-6 px-6 border-b sticky top-0 bg-background z-10">
                    <h2 className="text-2xl font-bold mb-2">Quick Wins</h2>
                    <p className="text-sm text-muted-foreground">Small actions, big impact on your journey</p>
                  </div>

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

            <div className="flex flex-col gap-1">
              <Button variant="outline" className="h-20 flex flex-col gap-2" disabled>
                <Briefcase className="h-5 w-5" />
                <span className="text-xs">Jobs For You (soon)</span>
              </Button>
              <p className="text-[10px] text-muted-foreground text-center px-2">
                🔥 Opportunities aligned with your path + skills
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <Button variant="outline" className="h-20 flex flex-col gap-2" disabled>
                <Bot className="h-5 w-5" />
                <span className="text-xs">Automations (soon)</span>
              </Button>
              <p className="text-[10px] text-muted-foreground text-center px-2">
                🔥 Personalized recommendations from your data
              </p>
            </div>
          </div>
        </motion.div>

        {/* AI Insights Chat */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <h3 className="text-lg font-semibold mb-3">Your Coach</h3>
          <Card className="bg-card/50 backdrop-blur-sm border border-border/50">
            <CardContent className="p-0">
              {/* Chat Messages */}
              <div className="px-4 py-4 space-y-3 max-h-80 overflow-y-auto">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="relative w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        {/* Mini emerald bubble matching signup page */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/20 to-emerald-600/10 blur-sm" />
                        <div className="relative w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400/20 via-emerald-300/15 to-emerald-500/25 backdrop-blur-sm border border-emerald-400/20">
                          <div className="absolute inset-1 rounded-full bg-gradient-to-br from-emerald-400/30 via-emerald-300/20 to-emerald-600/30">
                            <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-white/30 blur-[1px]" />
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-0.5 h-0.5 rounded-full bg-white/60" />
                          </div>
                        </div>
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-muted/70 text-foreground"
                      }`}
                    >
                      {formatMessageContent(msg.content)}
                    </div>
                  </div>
                ))}
                {isGenerating && (
                  <div className="flex gap-2 justify-start">
                    <div className="relative w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      {/* Pulsing mini emerald bubble */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/30 to-emerald-600/20 blur-sm animate-pulse" />
                      <div className="relative w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400/20 via-emerald-300/15 to-emerald-500/25 backdrop-blur-sm border border-emerald-400/20 animate-pulse">
                        <div className="absolute inset-1 rounded-full bg-gradient-to-br from-emerald-400/30 via-emerald-300/20 to-emerald-600/30">
                          <div className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-white/30 blur-[1px]" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-0.5 h-0.5 rounded-full bg-white animate-pulse" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-muted/70 rounded-2xl px-3.5 py-2">
                      <div className="flex gap-1">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Suggestions */}
              {chatMessages.length <= 1 && !isGenerating && activePath && (
                <div className="px-4 pb-3 flex flex-wrap gap-2">
                  <button
                    onClick={generateTodaysActions}
                    className="text-[11px] px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                  >
                    Today's Actions
                  </button>
                  <button
                    onClick={() => {
                      setInputMessage("What skills should I focus on this week?");
                      setTimeout(() => handleSendMessage(), 100);
                    }}
                    className="text-[11px] px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                  >
                    Key skills
                  </button>
                  <button
                    onClick={() => {
                      setInputMessage("What are the market trends in my field?");
                      setTimeout(() => handleSendMessage(), 100);
                    }}
                    className="text-[11px] px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors"
                  >
                    Market trends
                  </button>
                </div>
              )}

              {/* Input Area */}
              <div className="border-t border-border/50 px-3 py-2.5">
                <div className="flex gap-2">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Ask about your journey, skills, market..."
                    className="flex-1 h-9 text-base border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 placeholder:text-muted-foreground/60"
                    disabled={isGenerating}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isGenerating}
                    size="sm"
                    className="h-9 w-9 p-0 rounded-full flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
