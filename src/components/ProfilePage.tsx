import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Trophy, Target, Flame, Pencil, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const ProfilePage = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const [currentPath, setCurrentPath] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [joinDate, setJoinDate] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Format join date
        const date = new Date(user.created_at);
        setJoinDate(date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

        // Load user profile for display name
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile?.display_name) {
          setDisplayName(profile.display_name);
          setEditName(profile.display_name);
        } else {
          const defaultName = user.email?.split('@')[0] || 'User';
          setDisplayName(defaultName);
          setEditName(defaultName);
        }

        // Load user stats
        const { data: stats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

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
          .maybeSingle();

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

  const handleSaveName = async () => {
    if (!user || !editName.trim()) return;

    const { error } = await supabase
      .from('user_profiles')
      .upsert({ 
        user_id: user.id, 
        display_name: editName.trim() 
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      toast({
        title: "Error",
        description: "Could not update name",
        variant: "destructive"
      });
    } else {
      setDisplayName(editName.trim());
      setIsEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Name updated"
      });
    }
  };

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
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-2xl font-semibold">{displayName}</h2>
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Name</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Display Name</Label>
                    <Input
                      id="name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveName}>
                      Save
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Started {joinDate}</span>
          </div>
        </div>

        {/* Progress Stats */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Flame className="h-4 w-4 text-foreground/60" />
                <span className="text-sm">Day Streak</span>
              </div>
              <span className="font-semibold">{userStats?.current_streak || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Target className="h-4 w-4 text-foreground/60" />
                <span className="text-sm">Missions Completed</span>
              </div>
              <span className="font-semibold">{userStats?.missions_completed || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Trophy className="h-4 w-4 text-foreground/60" />
                <span className="text-sm">Badges Earned</span>
              </div>
              <span className="font-semibold">{badges.length}</span>
            </div>
          </CardContent>
        </Card>

        {/* Current Path */}
        {currentPath && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Current Path</h3>
                <Badge variant="secondary">{currentPath.difficulty_level || 'Beginner'}</Badge>
              </div>
              <h4 className="text-lg font-semibold mb-2">{currentPath.title}</h4>
              <p className="text-sm text-muted-foreground mb-3">{currentPath.description}</p>
              {currentPath.journey_duration && (
                <div className="text-xs text-muted-foreground">
                  Duration: {currentPath.journey_duration}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Badges */}
        {badges.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">
              Badges
            </h3>
            <div className="grid grid-cols-4 gap-3">
              {badges.map((badge: any, index: number) => (
                <div key={index} className="flex flex-col items-center gap-2">
                  <div className="text-2xl">{badge.badges.icon}</div>
                  <p className="text-xs text-center text-muted-foreground">{badge.badges.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Account Actions */}
        <div className="space-y-2 pt-4">
          <Button variant="ghost" className="w-full justify-start" size="lg">
            <Settings className="h-4 w-4 mr-3" />
            Account Settings
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive" 
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
