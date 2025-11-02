import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, LogOut, Settings, Trophy, Target, Flame, Star, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

export const ProfilePage = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [currentPath, setCurrentPath] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [joinDate, setJoinDate] = useState<string>("");

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Format join date
        const date = new Date(user.created_at);
        setJoinDate(date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

        // Load user stats
        const { data: stats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (stats) {
          setUserStats(stats);
        }

        // Load current path (most recent)
        const { data: path } = await supabase
          .from('career_paths')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (path) {
          setCurrentPath(path);
        }

        // Load earned badges
        const { data: earnedBadges } = await supabase
          .from('user_badges')
          .select(`
            *,
            badges (name, icon, description)
          `)
          .eq('user_id', user.id)
          .order('earned_at', { ascending: false });

        if (earnedBadges) {
          setBadges(earnedBadges);
        }
      }
    };

    loadProfile();
  }, []);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Signed out",
        description: "You have been successfully signed out"
      });
    }
  };

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="max-w-md mx-auto space-y-8">
        {/* Profile Header */}
        <div>
          <h2 className="text-3xl font-bold mb-2">{user?.email?.split('@')[0] || 'User'}</h2>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="text-sm">Started {joinDate}</span>
          </div>
        </div>

        {/* Journey Path */}
        {currentPath ? (
          <Card className="border-none shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Target className="h-6 w-6 text-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Following Path</p>
                  <h3 className="font-semibold">{currentPath.title}</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{currentPath.description}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {currentPath.journey_duration && (
                  <span>{currentPath.journey_duration}</span>
                )}
                {currentPath.difficulty_level && (
                  <>
                    <span>•</span>
                    <span>{currentPath.difficulty_level}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-none shadow-sm">
            <CardContent className="p-6 text-center">
              <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Start your journey by creating your first path
              </p>
            </CardContent>
          </Card>
        )}

        {/* Progress Stats */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Progress</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div className="flex items-center gap-3">
                <Flame className="h-5 w-5 text-foreground/60" />
                <span className="text-sm">Current Streak</span>
              </div>
              <span className="font-semibold">{userStats?.current_streak || 0} days</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div className="flex items-center gap-3">
                <Trophy className="h-5 w-5 text-foreground/60" />
                <span className="text-sm">Missions Completed</span>
              </div>
              <span className="font-semibold">{userStats?.missions_completed || 0}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-foreground/60" />
                <span className="text-sm">Badges Earned</span>
              </div>
              <span className="font-semibold">{badges.length}</span>
            </div>
          </div>
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Achievements</p>
            <div className="grid grid-cols-4 gap-3">
              {badges.map((badge: any, index: number) => (
                <div key={index} className="text-center">
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-2 text-2xl">
                    {badge.badges.icon}
                  </div>
                  <p className="text-xs font-medium line-clamp-1">{badge.badges.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Account Actions */}
        <div className="space-y-2 pt-4 border-t border-border/50">
          <Button variant="ghost" className="w-full justify-start" size="lg">
            <Settings className="h-4 w-4 mr-3" />
            Account Settings
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10" 
            size="lg"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-3" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
};
