import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, LogOut, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";

export const ProfilePage = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    pathsGenerated: 0,
    photosUploaded: 0
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          const { count: pathsCount } = await supabase
            .from('career_paths')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          const { count: photosCount } = await supabase
            .from('user_photos')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          setStats({
            pathsGenerated: pathsCount || 0,
            photosUploaded: photosCount || 0
          });
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    };

    loadProfile();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({ title: "Signed out", description: "You have been successfully signed out" });
    } catch (error: any) {
      console.warn('Supabase signOut failed, applying local fallback:', error);
      try {
        const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined;
        if (projectRef) {
          localStorage.removeItem(`sb-${projectRef}-auth-token`);
        }
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith('sb-') && k.endsWith('-auth-token')) localStorage.removeItem(k);
        });
      } catch {}
      toast({ title: "Signed out locally", description: "Network issue detected. Reloading..." });
      setTimeout(() => window.location.reload(), 300);
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
            <Button 
              size="icon" 
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-2xl font-bold mb-1">{user?.email?.split('@')[0] || 'Guest'}</h2>
          <p className="text-sm text-muted-foreground">{user?.email || 'Not signed in'}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold mb-1">{stats.pathsGenerated}</div>
              <div className="text-xs text-muted-foreground">Paths Generated</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold mb-1">{stats.photosUploaded}</div>
              <div className="text-xs text-muted-foreground">Photos Uploaded</div>
            </CardContent>
          </Card>
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

        {/* Subscription Info */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Free Plan</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upgrade to unlock unlimited paths and premium features
            </p>
            <Button className="w-full">Upgrade to Pro</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
