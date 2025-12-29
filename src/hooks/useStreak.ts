import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, differenceInDays, parseISO, isToday, isYesterday } from 'date-fns';

export const useStreak = () => {
  const { user } = useAuth();

  const updateStreak = useCallback(async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak_days, last_activity_date')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return;

      const today = format(new Date(), 'yyyy-MM-dd');
      const lastActivity = profile.last_activity_date;

      // If already updated today, do nothing
      if (lastActivity === today) {
        return profile.streak_days;
      }

      let newStreak = 1;

      if (lastActivity) {
        const lastDate = parseISO(lastActivity);
        
        if (isYesterday(lastDate)) {
          // Consecutive day - increment streak
          newStreak = (profile.streak_days || 0) + 1;
        } else if (isToday(lastDate)) {
          // Same day - keep current streak
          newStreak = profile.streak_days || 1;
        } else {
          // Streak broken - reset to 1
          newStreak = 1;
        }
      }

      // Update profile with new streak and activity date
      await supabase
        .from('profiles')
        .update({
          streak_days: newStreak,
          last_activity_date: today,
        })
        .eq('user_id', user.id);

      return newStreak;
    } catch (error) {
      console.error('Error updating streak:', error);
      return null;
    }
  }, [user]);

  const checkStreak = useCallback(async () => {
    if (!user) return { streakDays: 0, isActive: false };

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('streak_days, last_activity_date')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile) return { streakDays: 0, isActive: false };

      const lastActivity = profile.last_activity_date;
      
      if (!lastActivity) {
        return { streakDays: 0, isActive: false };
      }

      const lastDate = parseISO(lastActivity);
      const isActive = isToday(lastDate) || isYesterday(lastDate);

      return {
        streakDays: isActive ? (profile.streak_days || 0) : 0,
        isActive,
      };
    } catch (error) {
      console.error('Error checking streak:', error);
      return { streakDays: 0, isActive: false };
    }
  }, [user]);

  return { updateStreak, checkStreak };
};
