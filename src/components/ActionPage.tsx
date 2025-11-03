import { Target, CheckCircle2, Circle, Sparkles, MessageSquare, Zap, Award, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const ActionPage = () => {
  const { user } = useAuth();
  const [activePath, setActivePath] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const currentStreak = 12;
  const totalPoints = 847;

  useEffect(() => {
    loadActivePath();
  }, [user]);

  const loadActivePath = async () => {
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
      }
    } catch (error) {
      console.error('Error loading active path:', error);
    } finally {
      setLoading(false);
    }
  };

  const roadmapMilestones = activePath?.roadmap || [
    { step: "Learn product storytelling", duration: "3 months", status: "completed", progress: 100 },
    { step: "Launch a side project", duration: "6 months", status: "in-progress", progress: 65 },
    { step: "Build your brand online", duration: "9 months", status: "upcoming", progress: 0 },
  ];

  const todayActions = [
    { task: "Review UI/UX principles", priority: "high", done: true },
    { task: "Connect with 3 designers", priority: "medium", done: false },
    { task: "Document project progress", priority: "low", done: false },
  ];

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
              <div className="text-2xl font-bold">{currentStreak}</div>
              <div className="text-xs text-muted-foreground">Day Streak</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Sparkles className="h-5 w-5 mx-auto mb-2 text-primary/70 stroke-[1.5]" />
              <div className="text-2xl font-bold">{totalPoints}</div>
              <div className="text-xs text-muted-foreground">Points</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Circle className="h-5 w-5 mx-auto mb-2 text-primary/70 stroke-[1.5]" />
              <div className="text-2xl font-bold">3/5</div>
              <div className="text-xs text-muted-foreground">Goals</div>
            </CardContent>
          </Card>
        </div>

        {/* Roadmap */}
        <div>
          <h3 className="text-lg font-semibold mb-3">
            {activePath ? `Roadmap to ${activePath.title}` : 'Your Roadmap'}
          </h3>
          {activePath ? (
            <div className="space-y-3">
              {roadmapMilestones.map((milestone: any, index: number) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">{milestone.step}</h4>
                        <div className="text-xs text-muted-foreground">
                          {milestone.duration}
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
                  Activate a career path to see your personalized roadmap
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
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Target className="h-5 w-5" />
              <span className="text-xs">Set Goals</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Zap className="h-5 w-5" />
              <span className="text-xs">Quick Wins</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
