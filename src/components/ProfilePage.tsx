import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, FileText, Image, Briefcase } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export const ProfilePage = () => {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ paths: 0, photos: 0 });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Error getting user:', userError);
        setLoading(false);
        return;
      }

      setUser(user);

      if (user) {
        // Load career paths count
        const { count: pathsCount, error: pathsError } = await supabase
          .from('career_paths')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (pathsError) {
          console.error('Error loading paths count:', pathsError);
        }

        // Load photos count
        const { count: photosCount, error: photosError } = await supabase
          .from('user_photos')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (photosError) {
          console.error('Error loading photos count:', photosError);
        }

        setStats({
          paths: pathsCount || 0,
          photos: photosCount || 0
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: "Signed out successfully" });
    } catch (error: any) {
      toast({ 
        title: "Error signing out", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  };

  if (loading) {
    return (
      <div className="px-4 pb-24 pt-4">
        <div className="max-w-md mx-auto">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const initials = user?.email?.substring(0, 2).toUpperCase() || "??";

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-1">
                  {user?.email?.split('@')[0] || 'User'}
                </h2>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 py-4 border-t border-border">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.paths}</div>
                <div className="text-xs text-muted-foreground">Paths</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.photos}</div>
                <div className="text-xs text-muted-foreground">Photos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">0</div>
                <div className="text-xs text-muted-foreground">Actions</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Info */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Account
          </p>
          
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">CV Upload</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.paths > 0 ? 'CV uploaded' : 'No CV uploaded'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Image className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Photos</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.photos} reference {stats.photos === 1 ? 'photo' : 'photos'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Career Paths</p>
                    <p className="text-xs text-muted-foreground">
                      {stats.paths} {stats.paths === 1 ? 'path' : 'paths'} generated
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Settings
          </p>
          
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Member since</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Logout */}
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
};