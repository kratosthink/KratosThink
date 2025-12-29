import React, { useState } from 'react';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
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
  lessonId: string;
  lessonTitle: string;
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
  lessonId,
  lessonTitle,
  onSuccess
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [revisionCount, setRevisionCount] = useState(3);
  const [saving, setSaving] = useState(false);

  const calculateRevisionDates = (): Date[] => {
    const intervals = getSpacedIntervals(revisionCount);
    return intervals.map(days => addDays(startDate, days));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const revisionDates = calculateRevisionDates();
      const formattedDates = revisionDates.map(d => format(d, 'yyyy-MM-dd'));

      const { error } = await supabase
        .from('lesson_revisions')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          start_date: format(startDate, 'yyyy-MM-dd'),
          revision_count: revisionCount,
          revision_dates: formattedDates,
          completed_dates: [],
        }, { onConflict: 'user_id,lesson_id' });

      if (error) throw error;

      toast({
        title: 'Révisions planifiées',
        description: `${revisionCount} révisions programmées pour "${lessonTitle}"`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving revision schedule:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de planifier les révisions.',
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
          <DialogTitle>📅 Révision espacée</DialogTitle>
          <DialogDescription>
            Planifiez vos révisions pour "{lessonTitle}" selon l'algorithme de répétition espacée.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Start Date */}
          <div className="grid gap-2">
            <Label>Date de début</Label>
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
                  {startDate ? format(startDate, "PPP", { locale: fr }) : "Choisir une date"}
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
            <Label>Nombre de révisions</Label>
            <Input
              type="number"
              min={1}
              max={7}
              value={revisionCount}
              onChange={(e) => setRevisionCount(Math.min(7, Math.max(1, parseInt(e.target.value) || 1)))}
            />
            <p className="text-xs text-muted-foreground">
              Entre 1 et 7 révisions (intervalles: J+1, J+3, J+7, J+14, J+30, J+60, J+120)
            </p>
          </div>

          {/* Preview */}
          <div className="grid gap-2">
            <Label>Dates de révision prévues</Label>
            <div className="space-y-1 p-3 bg-secondary/30 rounded-lg">
              {revisionDates.map((date, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Révision {idx + 1}</span>
                  <span className="font-medium">{format(date, "d MMMM yyyy", { locale: fr })}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Planifier'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
