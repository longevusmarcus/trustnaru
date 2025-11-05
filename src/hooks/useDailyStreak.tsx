import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useDailyStreak = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const trackDailyLogin = async () => {
      try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

        // Check if today's streak already exists
        const { data: existingStreak } = await supabase
          .from('daily_streaks')
          .select('id')
          .eq('user_id', user.id)
          .eq('streak_date', today)
          .maybeSingle();

        if (existingStreak) {
          // Already tracked today
          return;
        }

        // Record today's login
        const { error: insertError } = await supabase
          .from('daily_streaks')
          .insert({
            user_id: user.id,
            streak_date: today,
            completed: true
          });

        if (insertError) {
          console.error('Error recording daily streak:', insertError);
          return;
        }

        // Calculate current streak
        const { data: allStreaks } = await supabase
          .from('daily_streaks')
          .select('streak_date')
          .eq('user_id', user.id)
          .eq('completed', true)
          .order('streak_date', { ascending: false });

        if (!allStreaks || allStreaks.length === 0) return;

        // Calculate consecutive days
        let currentStreak = 0;
        let expectedDate = new Date();
        
        for (const streak of allStreaks) {
          const streakDate = new Date(streak.streak_date + 'T00:00:00');
          const expectedDateStr = expectedDate.toISOString().split('T')[0];
          const streakDateStr = streakDate.toISOString().split('T')[0];

          if (streakDateStr === expectedDateStr) {
            currentStreak++;
            expectedDate.setDate(expectedDate.getDate() - 1);
          } else {
            break;
          }
        }

        // Update user_stats with current streak
        const { data: existingStats } = await supabase
          .from('user_stats')
          .select('longest_streak')
          .eq('user_id', user.id)
          .maybeSingle();

        const longestStreak = Math.max(
          currentStreak,
          existingStats?.longest_streak || 0
        );

        await supabase
          .from('user_stats')
          .upsert({
            user_id: user.id,
            current_streak: currentStreak,
            longest_streak: longestStreak
          }, { onConflict: 'user_id' });

        console.log('Daily streak tracked:', { currentStreak, longestStreak });
        
        // Dispatch event to trigger UI refresh
        window.dispatchEvent(new CustomEvent('streakUpdated', { 
          detail: { currentStreak, longestStreak } 
        }));
      } catch (error) {
        console.error('Error in trackDailyLogin:', error);
      }
    };

    trackDailyLogin();
  }, [user?.id]);
};
