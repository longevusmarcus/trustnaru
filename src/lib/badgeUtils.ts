import { supabase } from "@/integrations/supabase/client";

export const checkAndAwardBadges = async (userId: string) => {
  try {
    // Get user stats
    const { data: stats } = await supabase
      .from('user_stats')
      .select('missions_completed, paths_explored, current_level, longest_streak')
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

    // Check AI chat usage (goals)
    const { count: goalsCount } = await supabase
      .from('goals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const hasUsedAiChat = (goalsCount || 0) > 0;

    // Get streak data
    const { data: streakDates } = await supabase
      .from('daily_streaks')
      .select('streak_date')
      .eq('user_id', userId)
      .eq('completed', true)
      .order('streak_date', { ascending: false });

    // Calculate consecutive streak
    let consecutiveStreak = 0;
    if (streakDates && streakDates.length > 0) {
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
    const hasSixMonthStreak = Math.max(consecutiveStreak, stats?.longest_streak || 0) >= 180;

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
        case 'oracle_mastery':
          const hasCompletedAllLevels = (stats?.current_level || 1) >= 10;
          shouldAward = hasCompletedAllLevels && hasUsedAiChat && hasSixMonthStreak;
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
