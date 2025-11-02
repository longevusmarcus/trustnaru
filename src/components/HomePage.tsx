import { ChevronRight, Target, BookOpen, Compass, Flame, Award } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";

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


export const HomePage = () => {
  const { toast } = useToast();
  const [userStats, setUserStats] = useState<any>(null);
  const [streaks, setStreaks] = useState<Date[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<any[]>([]);
  const weekDates = getWeekDates();

  useEffect(() => {
    const fetchGamificationData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weekStart = weekDates[0].toISOString().split('T')[0];
      const weekEnd = weekDates[6].toISOString().split('T')[0];

      // Fetch all data in parallel
      const [statsResult, streakResult, badgesResult] = await Promise.all([
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
          .limit(3)
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
    };

    fetchGamificationData();
  }, []);

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Greeting */}
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold">Hey, Izzy</h2>
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
          <Card className="bg-card-dark text-card-dark-foreground overflow-hidden">
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
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Featured</p>
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-2">Design Your Future</h3>
            <p className="text-sm text-muted-foreground mb-4">
              A guided pathway to visualize and plan your ideal future self
            </p>
            <div className="text-xs text-muted-foreground">30 min • Beginner friendly</div>
          </Card>
        </div>
      </div>
    </div>
  );
};
