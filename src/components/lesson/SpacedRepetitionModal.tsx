import React, { useState } from 'react';
import { format, addDays } from 'date-fns';
import { enUS, fr } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SpacedRepetitionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseTitle: string;
  onSuccess?: () => void;
}

// Spaced repetition intervals in days (based on Leitner system)
const getSpacedIntervals = (count: number): number[] => {
  const intervals = [1, 3, 7, 14, 30, 60, 120];
  return intervals.slice(0, count);
};

export const SpacedRepetitionModal: React.FC<SpacedRepetitionModalProps> = ({
  open,
  onOpenChange,
  courseId,
  courseTitle,
  onSuccess
}) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [revisionCount, setRevisionCount] = useState(3);
  const [saving, setSaving] = useState(false);

  const dateLocale = language === 'fr' ? fr : enUS;

  const calculateRevisionDates = (): Date[] => {
    const intervals = getSpacedIntervals(revisionCount);
    return intervals.map(days => addDays(startDate, days));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      // First get all lessons for this course
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', courseId);

      if (lessonsError) throw lessonsError;

      const revisionDates = calculateRevisionDates();
      const formattedDates = revisionDates.map(d => format(d, 'yyyy-MM-dd'));

      // Create revision entries for all lessons in the course
      const revisionEntries = (lessons || []).map(lesson => ({
        user_id: user.id,
        lesson_id: lesson.id,
        start_date: format(startDate, 'yyyy-MM-dd'),
        revision_count: revisionCount,
        revision_dates: formattedDates,
        completed_dates: [],
      }));

      // Upsert all revisions
      for (const entry of revisionEntries) {
        const { error } = await supabase
          .from('lesson_revisions')
          .upsert(entry, { onConflict: 'user_id,lesson_id' });
        
        if (error) throw error;
      }

      toast({
        title: t('revision.scheduled') || 'Revisions scheduled',
        description: `${revisionCount} ${t('revision.revisionsFor') || 'revisions scheduled for'} "${courseTitle}"`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving revision schedule:', error);
      toast({
        title: t('common.error') || 'Error',
        description: t('revision.errorScheduling') || 'Unable to schedule revisions.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const revisionDates = calculateRevisionDates();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>📅 {t('revision.spacedRepetition') || 'Spaced Repetition'}</DialogTitle>
          <DialogDescription>
            {t('revision.scheduleDescription') || `Schedule your revisions for "${courseTitle}" using the spaced repetition algorithm.`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Start Date */}
          <div className="grid gap-2">
            <Label>{t('revision.startDate') || 'Start Date'}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP", { locale: dateLocale }) : (t('revision.chooseDate') || "Choose a date")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Revision Count */}
          <div className="grid gap-2">
            <Label>{t('revision.revisionCount') || 'Number of revisions'}</Label>
            <Input
              type="number"
              min={1}
              max={7}
              value={revisionCount}
              onChange={(e) => setRevisionCount(Math.min(7, Math.max(1, parseInt(e.target.value) || 1)))}
            />
            <p className="text-xs text-muted-foreground">
              {t('revision.intervalsExplanation') || 'Between 1 and 7 revisions (intervals: D+1, D+3, D+7, D+14, D+30, D+60, D+120)'}
            </p>
          </div>

          {/* Preview */}
          <div className="grid gap-2">
            <Label>{t('revision.plannedDates') || 'Planned revision dates'}</Label>
            <div className="space-y-1 p-3 bg-secondary/30 rounded-lg">
              {revisionDates.map((date, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{t('revision.revision') || 'Revision'} {idx + 1}</span>
                  <span className="font-medium">{format(date, "d MMMM yyyy", { locale: dateLocale })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.saving') || 'Saving...'}
              </>
            ) : (
              t('revision.schedule') || 'Schedule'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};