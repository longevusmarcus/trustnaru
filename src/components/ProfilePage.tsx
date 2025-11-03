import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Trophy, Target, Flame, Pencil, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { ImportMentorsUtil } from "@/components/ImportMentorsUtil";

export const ProfilePage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [joinDate, setJoinDate] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [editName, setEditName] = useState<string>("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {

      if (user) {
        const date = new Date(user.created_at);
        setJoinDate(date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }));

        // Load all data in parallel
        const [profileResult, statsResult, badgesResult] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('display_name, cv_url, voice_transcription')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('user_badges')
            .select('*, badges (name, icon, description)')
            .eq('user_id', user.id)
            .order('earned_at', { ascending: false })
        ]);

        if (profileResult.data) {
          setUserProfile(profileResult.data);
          if (profileResult.data.display_name) {
            setDisplayName(profileResult.data.display_name);
            setEditName(profileResult.data.display_name);
          } else {
            const defaultName = user.email?.split('@')[0] || 'User';
            setDisplayName(defaultName);
            setEditName(defaultName);
          }
        } else {
          const defaultName = user.email?.split('@')[0] || 'User';
          setDisplayName(defaultName);
          setEditName(defaultName);
        }

        if (statsResult.data) {
          setUserStats(statsResult.data);
        }

        if (badgesResult.data) {
          setBadges(badgesResult.data);
        }
      }
    };

    loadProfile();
  }, [user]);

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

        {/* CV Summary */}
        {userProfile?.cv_url && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
                Professional Background
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground/60" />
                  <span>CV uploaded and analyzed</span>
                </div>
                <p className="text-muted-foreground text-xs pl-3.5">
                  Your professional experience and skills have been captured
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Energy Summary */}
        {userProfile?.voice_transcription && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
                Energy & Passions
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-foreground/60" />
                  <span>Voice transcript uploaded and analyzed</span>
                </div>
                <p className="text-muted-foreground text-xs pl-3.5">
                  Your motivations and interests have been understood
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Voice Summary */}
        {userProfile?.voice_transcription && (
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
                Voice Transcription
              </h3>
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  "{userProfile.voice_transcription.substring(0, 200)}{userProfile.voice_transcription.length > 200 ? '...' : ''}"
                </p>
                {userProfile.voice_transcription.length > 200 && (
                  <Button variant="ghost" size="sm" className="text-xs h-auto p-0 text-muted-foreground">
                    Read full transcription
                  </Button>
                )}
              </div>
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
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            size="lg"
            onClick={() => window.location.href = '/settings'}
          >
            <Settings className="h-4 w-4 mr-3" />
            Account Settings
          </Button>
          
          {/* Dev Utility: Import Mentors */}
          <ImportMentorsUtil />
          
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
