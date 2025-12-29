import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Award, Star, Sparkles } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface BadgeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  badgeName: string;
  badgeDescription: string;
  lessonTitle: string;
  pointsEarned: number;
}

export const BadgeModal: React.FC<BadgeModalProps> = ({
  open,
  onOpenChange,
  badgeName,
  badgeDescription,
  lessonTitle,
  pointsEarned,
}) => {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader>
          <DialogTitle className="sr-only">{t('badges.earned') || 'Badge Earned!'}</DialogTitle>
        </DialogHeader>
        
        <div className="py-6 space-y-6">
          {/* Badge Animation */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-warning/20 animate-ping" />
            </div>
            <div className="relative flex items-center justify-center">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-warning to-warning/80 flex items-center justify-center shadow-lg animate-float">
                <Award className="h-14 w-14 text-warning-foreground" />
              </div>
              <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-warning animate-pulse" />
              <Star className="absolute -bottom-1 -left-1 h-6 w-6 text-warning animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>

          {/* Badge Info */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {t('badges.congratulations') || 'Congratulations!'}
            </h2>
            <p className="text-muted-foreground">
              {t('badges.youEarned') || 'You earned a badge'}
            </p>
          </div>

          {/* Badge Details */}
          <div className="p-4 bg-secondary/50 rounded-lg space-y-2">
            <h3 className="font-bold text-lg text-foreground">{badgeName}</h3>
            <p className="text-sm text-muted-foreground">{badgeDescription}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {t('badges.forCompleting') || 'For completing'}: {lessonTitle}
            </p>
          </div>

          {/* Points */}
          <div className="flex items-center justify-center gap-2 text-success">
            <Star className="h-5 w-5" />
            <span className="font-bold">+{pointsEarned} {t('points.earned')}</span>
          </div>

          <Button onClick={() => onOpenChange(false)} className="w-full">
            {t('common.continue') || 'Continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
