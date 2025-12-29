import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Gift, Lock, Music, Sparkles } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';

interface Reward {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  icon: React.ElementType;
  unlocked: boolean;
}

interface RewardTrackerProps {
  totalPoints: number;
}

export const RewardTracker: React.FC<RewardTrackerProps> = ({ totalPoints }) => {
  const { t } = useLanguage();

  const rewards: Reward[] = [
    {
      id: 'night-music',
      name: t('rewards.nightMusic') || 'Night Music',
      description: t('rewards.nightMusicDesc') || 'Unlock relaxing background music for night mode',
      pointsRequired: 100,
      icon: Music,
      unlocked: totalPoints >= 100,
    },
    {
      id: 'premium-themes',
      name: t('rewards.premiumThemes') || 'Premium Themes',
      description: t('rewards.premiumThemesDesc') || 'Unlock exclusive color themes',
      pointsRequired: 250,
      icon: Sparkles,
      unlocked: totalPoints >= 250,
    },
    {
      id: 'special-badges',
      name: t('rewards.specialBadges') || 'Special Badges',
      description: t('rewards.specialBadgesDesc') || 'Access to exclusive badge collection',
      pointsRequired: 500,
      icon: Gift,
      unlocked: totalPoints >= 500,
    },
  ];

  // Find next reward to unlock
  const nextReward = rewards.find(r => !r.unlocked);
  const previousReward = rewards.filter(r => r.unlocked).pop();

  if (!nextReward) {
    return (
      <Card className="border-border/50 bg-gradient-to-r from-success/10 to-success/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-success/20">
              <Gift className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-medium text-foreground">{t('rewards.allUnlocked') || 'All rewards unlocked!'}</p>
              <p className="text-sm text-muted-foreground">{t('rewards.congrats') || 'Congratulations on your achievement!'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const progressToNext = previousReward 
    ? ((totalPoints - previousReward.pointsRequired) / (nextReward.pointsRequired - previousReward.pointsRequired)) * 100
    : (totalPoints / nextReward.pointsRequired) * 100;

  const pointsRemaining = nextReward.pointsRequired - totalPoints;

  return (
    <Card className="border-border/50">
      <CardContent className="py-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-warning/20">
                <nextReward.icon className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t('rewards.nextReward') || 'Next Reward'}</p>
                <p className="text-xs text-muted-foreground">{nextReward.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="text-sm">{pointsRemaining} pts</span>
            </div>
          </div>
          
          <Progress value={Math.min(progressToNext, 100)} className="h-2" />
          
          <p className="text-xs text-muted-foreground text-center">
            {nextReward.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
