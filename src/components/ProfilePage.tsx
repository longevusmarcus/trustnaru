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
      <div className="max-w-md mx-auto space-y-6">
        {/* Profile Header */}
        <div className="text-center">
          <div className="relative inline-block mb-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
              <Camera className="h-10 w-10 text-muted-foreground" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-1">{user?.email?.split('@')[0] || 'User'}</h2>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Started {joinDate}</span>
          </div>
        </div>

        {/* Gamification Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Flame className="h-5 w-5 text-orange-500 mx-auto mb-2" />
              <div className="text-2xl font-bold mb-1">{userStats?.current_streak || 0}</div>
              <div className="text-xs text-muted-foreground">Day Streak</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Star className="h-5 w-5 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold mb-1">{userStats?.total_points || 0}</div>
              <div className="text-xs text-muted-foreground">Points</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-5 w-5 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold mb-1">{userStats?.missions_completed || 0}</div>
              <div className="text-xs text-muted-foreground">Missions</div>
            </CardContent>
          </Card>
        </div>

        {/* Current Path */}
        {currentPath && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Current Path</h3>
                <Badge variant="secondary">{currentPath.difficulty_level || 'Beginner'}</Badge>
              </div>
              <h4 className="text-lg font-bold mb-2">{currentPath.title}</h4>
              <p className="text-sm text-muted-foreground mb-3">{currentPath.description}</p>
              {currentPath.journey_duration && (
                <div className="text-xs text-muted-foreground">
                  Duration: {currentPath.journey_duration}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Achievements & Badges */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Achievements
            </h3>
            <Trophy className="h-4 w-4 text-yellow-500" />
          </div>
          
          {badges.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
              {badges.map((badge: any, index: number) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 text-center">
                    <div className="text-3xl mb-2">{badge.badges.icon}</div>
                    <p className="text-xs font-medium mb-1">{badge.badges.name}</p>
                    <p className="text-xs text-muted-foreground">{badge.badges.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Complete missions to earn your first badge!
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Account Actions */}
        <div className="space-y-3">
          <Button variant="outline" className="w-full justify-start" size="lg">
            <Settings className="h-4 w-4 mr-3" />
            Account Settings
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start text-destructive hover:text-destructive" 
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
