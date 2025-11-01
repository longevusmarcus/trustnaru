import { Target, CheckCircle2, Circle, Sparkles, MessageSquare, Zap, Award, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const ActionPage = () => {
  const currentStreak = 12;
  const totalPoints = 847;

  const roadmapMilestones = [
    { title: "Learn product storytelling", status: "completed", progress: 100 },
    { title: "Launch a side project", status: "in-progress", progress: 65 },
    { title: "Build your brand online", status: "upcoming", progress: 0 },
  ];

  const todayActions = [
    { task: "Review UI/UX principles", priority: "high", done: true },
    { task: "Connect with 3 designers", priority: "medium", done: false },
    { task: "Document project progress", priority: "low", done: false },
  ];

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Gamification Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-card-dark text-card-dark-foreground">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary/70 stroke-[1.5]" />
              <div className="text-2xl font-bold">{currentStreak}</div>
              <div className="text-xs text-muted-foreground">Day Streak</div>
            </CardContent>
          </Card>
          <Card className="bg-card-dark text-card-dark-foreground">
            <CardContent className="p-4 text-center">
              <Sparkles className="h-5 w-5 mx-auto mb-2 text-primary/70 stroke-[1.5]" />
              <div className="text-2xl font-bold">{totalPoints}</div>
              <div className="text-xs text-muted-foreground">Points</div>
            </CardContent>
          </Card>
          <Card className="bg-card-dark text-card-dark-foreground">
            <CardContent className="p-4 text-center">
              <Circle className="h-5 w-5 mx-auto mb-2 text-primary/70 stroke-[1.5]" />
              <div className="text-2xl font-bold">3/5</div>
              <div className="text-xs text-muted-foreground">Goals</div>
            </CardContent>
          </Card>
        </div>

        {/* Roadmap */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Your Roadmap</h3>
          <div className="space-y-3">
            {roadmapMilestones.map((milestone, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {milestone.status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : milestone.status === "in-progress" ? (
                        <Circle className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium mb-2">{milestone.title}</h4>
                      {milestone.status !== "upcoming" && (
                        <Progress value={milestone.progress} className="h-2" />
                      )}
                      {milestone.status !== "upcoming" && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {milestone.progress}% complete
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

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

        {/* AI Chat Assistant */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-1" />
              <div className="flex-1">
                <h4 className="font-medium mb-1">AI Coach</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  "You're 65% through your milestone! Focus on user testing this week."
                </p>
                <Button size="sm" className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Chat with AI Coach
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

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
