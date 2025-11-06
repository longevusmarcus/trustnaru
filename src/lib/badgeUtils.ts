import { supabase } from "@/integrations/supabase/client";

export const checkAndAwardBadges = async (userId: string) => {
  try {
    // Get user stats and additional data for complex badge requirements
    const [statsResult, pathsResult, profileResult, streakResult, goalsResult] = await Promise.all([
      supabase
        .from('user_stats')
        .select('missions_completed, paths_explored, current_level, longest_streak')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('career_paths')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('user_profiles')
        .select('active_path_id')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('daily_streaks')
        .select('streak_date')
        .eq('user_id', userId)
        .eq('completed', true)
        .order('streak_date', { ascending: false }),
      supabase
        .from('goals')
        .select('id')
        .eq('user_id', userId)
        .limit(1)
    ]);

    const stats = statsResult.data;
    const pathsGenerated = pathsResult.count || 0;
    const hasActivePath = !!profileResult.data?.active_path_id;
    const currentLevel = stats?.current_level || 1;
    const longestStreak = stats?.longest_streak || 0;
    
    // Calculate consecutive streak days
    const streakDates = streakResult.data || [];
    let consecutiveStreak = 0;
    if (streakDates.length > 0) {
      consecutiveStreak = 1;
      for (let i = 0; i < streakDates.length - 1; i++) {
        const currentDate = new Date(streakDates[i].streak_date);
        const nextDate = new Date(streakDates[i + 1].streak_date);
        const dayDiff = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));
        if (dayDiff === 1) {
          consecutiveStreak++;
        } else {
          break;
        }
      }
    }
    
    const hasUsedAiChat = (goalsResult.data?.length || 0) > 0;

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
          // Oracle badge requires: completed all levels (10+), used AI chat, and 6-month streak (180 days)
          const hasCompletedAllLevels = currentLevel >= 10;
          const hasSixMonthStreak = Math.max(consecutiveStreak, longestStreak) >= badge.requirement_count;
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
