import { supabase } from "@/integrations/supabase/client";

export const checkAndAwardBadges = async (userId: string) => {
  try {
    // Get user stats
    const { data: stats } = await supabase
      .from('user_stats')
      .select('missions_completed, paths_explored')
      .eq('user_id', userId)
      .maybeSingle();

    // Count total paths generated
    const { count: pathsGenerated } = await supabase
      .from('career_paths')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Check if user has an active path
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('active_path_id')
      .eq('user_id', userId)
      .maybeSingle();

    const hasActivePath = !!profile?.active_path_id;

    // Get all badges and user's earned badges
    const [badgesResult, userBadgesResult] = await Promise.all([
      supabase.from('badges').select('*'),
      supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', userId)
    ]);

    const allBadges = badgesResult.data || [];
    const earnedBadgeIds = new Set(
      (userBadgesResult.data || []).map(ub => ub.badge_id)
    );

    // Check each badge requirement
    const badgesToAward: string[] = [];

    for (const badge of allBadges) {
      // Skip if already earned
      if (earnedBadgeIds.has(badge.id)) continue;

      let shouldAward = false;

      switch (badge.requirement_type) {
        case 'paths_generated':
          shouldAward = (pathsGenerated || 0) >= badge.requirement_count;
          break;
        case 'paths_activated':
          shouldAward = hasActivePath && badge.requirement_count === 1;
          break;
        case 'missions':
          shouldAward = (stats?.missions_completed || 0) >= badge.requirement_count;
          break;
      }

      if (shouldAward) {
        badgesToAward.push(badge.id);
      }
    }

    // Award new badges
    if (badgesToAward.length > 0) {
      const { error } = await supabase
        .from('user_badges')
        .insert(
          badgesToAward.map(badgeId => ({
            user_id: userId,
            badge_id: badgeId
          }))
        );

      if (error) {
        console.error('Error awarding badges:', error);
      }
    }

    return badgesToAward.length;
  } catch (error) {
    console.error('Error in checkAndAwardBadges:', error);
    return 0;
  }
};
