import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { TrendingUp, Target, Award, Lightbulb, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const InsightsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activePath, setActivePath] = useState<any>(null);
  const [allPaths, setAllPaths] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);

  // Always reload when component mounts or user changes
  useEffect(() => {
    loadInsights();
  }, [user]);

  // Also reload when page becomes visible (browser tab focus)
  useEffect(() => {
    const handleFocus = () => {
      loadInsights();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

  const loadInsights = async () => {
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
        const { data: path } = await supabase
          .from('career_paths')
          .select('*')
          .eq('id', profile.active_path_id)
          .single();

        setActivePath(path);
      }

      // Get all career paths
      const { data: paths } = await supabase
        .from('career_paths')
        .select('*')
        .eq('user_id', user.id);

      setAllPaths(paths || []);

      // Get user stats
      const { data: stats } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setUserStats(stats);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate insights
  const pathCategories = [...new Set(allPaths.map(p => p.category).filter(Boolean))];
  const progressPercentage = activePath ? Math.min(33, (userStats?.missions_completed || 0) * 10) : 0;
  
  const personalizedTips = activePath ? [
    `Focus on ${activePath.key_skills?.[0] || 'key skills'} this week to accelerate your progress`,
    `Research ${activePath.target_companies?.[0] || 'companies'} to understand their culture`,
    `Connect with professionals in ${activePath.category} on LinkedIn`,
  ] : [
    "Activate a career path to get personalized guidance",
    "Complete the wizard to discover paths tailored to you",
  ];

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
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* Progress Overview */}
        {activePath && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Active Path Progress</h3>
                    <p className="text-sm text-muted-foreground">{activePath.title}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Journey Progress</span>
                    <span className="font-medium">{progressPercentage}%</span>
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="text-lg font-semibold mb-3">Your Journey</h3>
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary/70" />
                <div className="text-2xl font-bold">{userStats?.current_streak || 0}</div>
                <div className="text-xs text-muted-foreground">Day Streak</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Sparkles className="h-5 w-5 mx-auto mb-2 text-primary/70" />
                <div className="text-2xl font-bold">{allPaths.length}</div>
                <div className="text-xs text-muted-foreground">Paths Explored</div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Path Diversity */}
        {pathCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Award className="h-5 w-5 text-primary/70" />
                  <h4 className="font-medium">Career Diversity</h4>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  You're exploring {pathCategories.length} different career direction{pathCategories.length !== 1 ? 's' : ''}
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

        {/* Personalized Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold mb-3">Smart Tips</h3>
          <div className="space-y-3">
            {personalizedTips.map((tip, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-primary/70 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground">{tip}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Weekly Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-lg font-semibold mb-3">This Week</h3>
          <Card className="bg-card/50">
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-medium">Keep Building Momentum</h4>
                <p className="text-sm text-muted-foreground">
                  {activePath 
                    ? `You're on track with ${activePath.title}. Complete today's actions to maintain your streak!`
                    : "Start by activating a career path to begin your journey"
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
