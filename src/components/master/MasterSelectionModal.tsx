import React from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Award, Star, Trophy } from 'lucide-react';

interface MasterSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseName: string;
  onConfirm: () => void;
  loading?: boolean;
}

export const MasterSelectionModal: React.FC<MasterSelectionModalProps> = ({
  open,
  onOpenChange,
  courseName,
  onConfirm,
  loading,
}) => {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-warning to-warning/50 flex items-center justify-center animate-pulse">
                <Trophy className="h-10 w-10 text-warning-foreground" />
              </div>
              <Star className="absolute -top-1 -right-1 h-6 w-6 text-warning fill-warning" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">{t('master.selectTitle')}</DialogTitle>
          <DialogDescription className="text-center">
            {t('master.selectDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-secondary/50 rounded-lg p-4 my-4">
          <p className="text-center font-semibold text-foreground">{courseName}</p>
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
            <Award className="h-4 w-4" />
            <span>{t('master.diplomaInfo')}</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          {t('master.warningOnce')}
        </p>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="bg-warning text-warning-foreground hover:bg-warning/90">
            <Trophy className="h-4 w-4 mr-2" />
            {t('master.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};