import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useBadgeAwarding = () => {
  const { user } = useAuth();

  const checkAndAwardBadges = async () => {
    if (!user) return;

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
      const [statsResult, pathsResult, profileResult] = await Promise.all([
        supabase
          .from('user_stats')
          .select('missions_completed')
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
          .maybeSingle()
      ]);

      const missionsCompleted = statsResult.data?.missions_completed || 0;
      const pathsGenerated = pathsResult.data?.length || 0;
      const hasActivePath = !!profileResult.data?.active_path_id;

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

        console.log(`Awarded ${badgesToAward.length} new badge(s)`);
      }
    } catch (error) {
      console.error('Error awarding badges:', error);
    }
  };

  return { checkAndAwardBadges };
};

// Auto-check hook that runs on mount
export const useAutoBadgeCheck = () => {
  const { checkAndAwardBadges } = useBadgeAwarding();

  useEffect(() => {
    checkAndAwardBadges();
  }, []);

  return { checkAndAwardBadges };
};
