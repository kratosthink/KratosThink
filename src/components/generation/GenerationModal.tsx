/**
 * Generation Modal Component
 * Allows users to select difficulty level and number of lessons before course generation
 * 
 * LOVABLE SERVICES USED:
 * - Lovable Cloud (Supabase Edge Functions) for AI-powered course generation
 * - Lovable AI Gateway for content generation via generate-course function
 */
import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { GraduationCap, BookOpen, Loader2 } from 'lucide-react';

interface GenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: string;
  onGenerate: (level: string, lessonCount: number) => void;
  generating: boolean;
}

const levels = [
  { id: 'beginner', label: 'Beginner', description: 'Basic concepts and fundamentals' },
  { id: 'intermediate', label: 'Intermediate', description: 'Build on existing knowledge' },
  { id: 'advanced', label: 'Advanced', description: 'Deep dive into complex topics' },
  { id: 'expert', label: 'Expert', description: 'Master-level comprehensive content' },
];

export const GenerationModal: React.FC<GenerationModalProps> = ({
  open,
  onOpenChange,
  topic,
  onGenerate,
  generating,
}) => {
  const { t } = useLanguage();
  const [level, setLevel] = useState('intermediate');
  const [lessonCount, setLessonCount] = useState([6]);

  const handleGenerate = () => {
    onGenerate(level, lessonCount[0]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Course Settings
          </DialogTitle>
          <DialogDescription>
            Configure your course on "<span className="font-medium text-foreground">{topic}</span>"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Difficulty Level */}
          <div className="space-y-3">
            <Label className="text-base font-medium">{t('generation.selectLevel')}</Label>
            <RadioGroup value={level} onValueChange={setLevel} className="space-y-2">
              {levels.map((l) => (
                <div
                  key={l.id}
                  className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    level === l.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50'
                  }`}
                  onClick={() => setLevel(l.id)}
                >
                  <RadioGroupItem value={l.id} id={l.id} />
                  <div className="flex-1">
                    <Label htmlFor={l.id} className="font-medium cursor-pointer">
                      {l.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">{l.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Lesson Count */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">{t('generation.selectLessons')}</Label>
              <span className="flex items-center gap-1 text-lg font-semibold text-primary">
                <BookOpen className="h-4 w-4" />
                {lessonCount[0]}
              </span>
            </div>
            <Slider
              value={lessonCount}
              onValueChange={setLessonCount}
              min={3}
              max={12}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>3 lessons</span>
              <span>12 lessons</span>
            </div>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full"
          size="lg"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('common.loading')}
            </>
          ) : (
            t('generation.generate')
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
