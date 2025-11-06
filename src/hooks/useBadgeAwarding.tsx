import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement_type: string;
  requirement_count: number;
  display_order: number;
}

export const useBadgeAwarding = () => {
  const { user } = useAuth();
  const [newlyAwardedBadge, setNewlyAwardedBadge] = useState<Badge | null>(null);

  const checkAndAwardBadges = async () => {
    if (!user) return null;

    try {
      // Get all badges
      const { data: allBadges } = await supabase
        .from('badges')
        .select('*')
        .order('display_order', { ascending: true });

      if (!allBadges) return;

      // Get user's current badges
      const { data: userBadges } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', user.id);

      const earnedBadgeIds = new Set(userBadges?.map(b => b.badge_id) || []);

      // Get user stats
      const [statsResult, pathsResult, profileResult, goalsResult, streaksResult] = await Promise.all([
        supabase
          .from('user_stats')
          .select('missions_completed, current_level, longest_streak')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('career_paths')
          .select('id')
          .eq('user_id', user.id),
        supabase
          .from('user_profiles')
          .select('active_path_id')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('goals')
          .select('id')
          .eq('user_id', user.id)
          .limit(1),
        supabase
          .from('daily_streaks')
          .select('streak_date')
          .eq('user_id', user.id)
          .eq('completed', true)
          .order('streak_date', { ascending: false })
      ]);

      const missionsCompleted = statsResult.data?.missions_completed || 0;
      const pathsGenerated = pathsResult.data?.length || 0;
      const hasActivePath = !!profileResult.data?.active_path_id;
      const currentLevel = statsResult.data?.current_level || 1;
      const longestStreak = statsResult.data?.longest_streak || 0;
      const hasUsedAiChat = (goalsResult.data?.length || 0) > 0;
      
      // Calculate consecutive streak
      let consecutiveStreak = 0;
      const streakDates = streaksResult.data || [];
      if (streakDates.length > 0) {
        consecutiveStreak = 1;
        for (let i = 0; i < streakDates.length - 1; i++) {
          const current = new Date(streakDates[i].streak_date);
          const next = new Date(streakDates[i + 1].streak_date);
          const diffDays = Math.floor((current.getTime() - next.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            consecutiveStreak++;
          } else {
            break;
          }
        }
      }
      const hasSixMonthStreak = Math.max(consecutiveStreak, longestStreak) >= 180;

      // Check each badge
      const badgesToAward = [];

      for (const badge of allBadges) {
        // Skip if already earned
        if (earnedBadgeIds.has(badge.id)) continue;

        let shouldAward = false;

        if (badge.requirement_type === 'missions') {
          shouldAward = missionsCompleted >= badge.requirement_count;
        } else if (badge.requirement_type === 'paths_generated') {
          shouldAward = pathsGenerated >= badge.requirement_count;
        } else if (badge.requirement_type === 'paths_activated') {
          shouldAward = hasActivePath && badge.requirement_count === 1;
        } else if (badge.requirement_type === 'oracle_mastery') {
          const hasCompletedAllLevels = currentLevel >= 10;
          shouldAward = hasCompletedAllLevels && hasUsedAiChat && hasSixMonthStreak;
        }

        if (shouldAward) {
          badgesToAward.push({
            user_id: user.id,
            badge_id: badge.id
          });
        }
      }

      // Award new badges
      if (badgesToAward.length > 0) {
        await supabase
          .from('user_badges')
          .insert(badgesToAward);

        // Return the first newly awarded badge for celebration
        const firstBadgeId = badgesToAward[0].badge_id;
        const awardedBadge = allBadges.find(b => b.id === firstBadgeId);
        
        if (awardedBadge) {
          setNewlyAwardedBadge(awardedBadge);
          return awardedBadge;
        }
      }
    } catch (error) {
      console.error('Error awarding badges:', error);
    }
    return null;
  };

  const clearCelebration = () => setNewlyAwardedBadge(null);

  return { checkAndAwardBadges, newlyAwardedBadge, clearCelebration };
};

// Auto-check hook that runs on mount
export const useAutoBadgeCheck = () => {
  const { checkAndAwardBadges, newlyAwardedBadge, clearCelebration } = useBadgeAwarding();

  useEffect(() => {
    checkAndAwardBadges();
  }, []);

  return { checkAndAwardBadges, newlyAwardedBadge, clearCelebration };
};
