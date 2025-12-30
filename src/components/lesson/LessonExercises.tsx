import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PenTool, ArrowRight, RotateCcw, Lightbulb, Maximize2, X, Loader2, Star, CheckCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

interface Exercise {
  question: string;
  hint?: string;
}

interface GradingResult {
  score: number;
  feedback: string;
  keyPoints: string[];
}

interface LessonExercisesProps {
  exercises: Exercise[] | null;
  lessonContent?: string;
}

export const LessonExercises: React.FC<LessonExercisesProps> = ({ exercises, lessonContent }) => {
  const { t } = useLanguage();
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [gradingResults, setGradingResults] = useState<Record<number, GradingResult>>({});
  const [grading, setGrading] = useState<Record<number, boolean>>({});
  const [showHint, setShowHint] = useState<Record<number, boolean>>({});
  const [completed, setCompleted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const defaultExercises: Exercise[] = [
    {
      question: t('exercises.question1'),
      hint: t('exercises.hint1'),
    },
    {
      question: t('exercises.question2'),
      hint: t('exercises.hint2'),
    },
    {
      question: t('exercises.question3'),
      hint: t('exercises.hint3'),
    },
  ];

  const exerciseList = exercises && exercises.length > 0 ? exercises : defaultExercises;
  const exercise = exerciseList[currentExercise];
  const progress = ((currentExercise + 1) / exerciseList.length) * 100;
  const totalScore = Object.values(gradingResults).reduce((sum, r) => sum + r.score, 0);
  const averageScore = Object.keys(gradingResults).length > 0 
    ? totalScore / Object.keys(gradingResults).length 
    : 0;

  const handleSubmitAnswer = async () => {
    const answer = userAnswers[currentExercise]?.trim();
    if (!answer || answer.length < 20) return;

    setGrading(prev => ({ ...prev, [currentExercise]: true }));

    try {
      const { data, error } = await supabase.functions.invoke('grade-exercise', {
        body: {
          question: exercise.question,
          userAnswer: answer,
          lessonContext: lessonContent?.substring(0, 2000) || '',
        },
      });

      if (error) throw error;

      setGradingResults(prev => ({
        ...prev,
        [currentExercise]: data,
      }));
    } catch (error) {
      console.error('Grading error:', error);
      // Fallback result
      setGradingResults(prev => ({
        ...prev,
        [currentExercise]: {
          score: 5,
          feedback: 'Unable to grade at this time. Your answer has been recorded.',
          keyPoints: [],
        },
      }));
    } finally {
      setGrading(prev => ({ ...prev, [currentExercise]: false }));
    }
  };

  const handleNext = () => {
    if (currentExercise < exerciseList.length - 1) {
      setCurrentExercise(currentExercise + 1);
    } else {
      setCompleted(true);
    }
  };

  const handleRetry = () => {
    setCurrentExercise(0);
    setUserAnswers({});
    setGradingResults({});
    setShowHint({});
    setCompleted(false);
  };

  const toggleHint = () => {
    setShowHint(prev => ({ ...prev, [currentExercise]: !prev[currentExercise] }));
  };

  const canSubmit = (userAnswers[currentExercise]?.trim().length || 0) >= 20;
  const hasResult = gradingResults[currentExercise] !== undefined;
  const result = gradingResults[currentExercise];

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-success';
    if (score >= 5) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return 'bg-success/10';
    if (score >= 5) return 'bg-warning/10';
    return 'bg-destructive/10';
  };

  if (completed) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">{t('exercises.completed')}</h3>
          <p className="text-muted-foreground mb-2">
            {t('exercises.yourScore')}: <span className={`font-bold ${getScoreColor(averageScore)}`}>{averageScore.toFixed(1)}{t('exercises.outOf10')}</span>
          </p>
          <div className="flex justify-center gap-4 mt-6">
            <Button variant="outline" onClick={handleRetry}>
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('exercises.restart')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const exerciseContent = (
    <>
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">
            {t('exercises.exercise')} {currentExercise + 1} {t('quiz.of')} {exerciseList.length}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium px-2 py-1 bg-secondary rounded">
              {t('exercises.shortAnswer')}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
        <CardTitle className="text-lg flex items-center gap-2 mt-4">
          <PenTool className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-normal text-muted-foreground">
            {Object.keys(gradingResults).length > 0 && (
              <>{t('exercises.yourScore')}: {averageScore.toFixed(1)}{t('exercises.outOf10')}</>
            )}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 flex-1 overflow-auto">
        {/* Question */}
        <div className="bg-secondary/30 rounded-lg p-4">
          <p className="text-foreground font-medium">{exercise.question}</p>
        </div>

        {/* Hint */}
        {exercise.hint && (
          <div>
            <Button variant="ghost" size="sm" onClick={toggleHint} className="text-muted-foreground">
              <Lightbulb className="h-4 w-4 mr-2" />
              {showHint[currentExercise] ? t('exercises.hideHint') : t('exercises.showHint')}
            </Button>
            {showHint[currentExercise] && (
              <div className="mt-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning-foreground">
                {exercise.hint}
              </div>
            )}
          </div>
        )}

        {/* Answer Input */}
        {!hasResult ? (
          <div className="space-y-2">
            <Textarea
              placeholder={t('exercises.writeAnswer')}
              value={userAnswers[currentExercise] || ''}
              onChange={(e) => setUserAnswers(prev => ({ ...prev, [currentExercise]: e.target.value }))}
              rows={6}
              className="resize-none"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{userAnswers[currentExercise]?.length || 0} {t('exercises.characters')}</span>
              <span>20 {t('exercises.minimum')}</span>
            </div>
          </div>
        ) : (
          /* Grading Result */
          <div className="space-y-4">
            <div className={`rounded-lg p-4 ${getScoreBg(result.score)}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-foreground">{t('exercises.yourScore')}</span>
                <div className="flex items-center gap-1">
                  <Star className={`h-5 w-5 ${getScoreColor(result.score)}`} />
                  <span className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
                    {result.score}{t('exercises.outOf10')}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-secondary/30 rounded-lg p-4">
              <h4 className="font-medium text-foreground mb-2">{t('exercises.feedback')}</h4>
              <p className="text-muted-foreground text-sm">{result.feedback}</p>
            </div>

            {result.keyPoints && result.keyPoints.length > 0 && (
              <div className="bg-secondary/30 rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-2">{t('exercises.keyPoints')}</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  {result.keyPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {!hasResult ? (
            <Button 
              onClick={handleSubmitAnswer} 
              disabled={!canSubmit || grading[currentExercise]}
            >
              {grading[currentExercise] ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('exercises.grading')}
                </>
              ) : (
                t('quiz.submit')
              )}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              {currentExercise < exerciseList.length - 1 ? (
                <>
                  {t('common.next')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                t('exercises.seeResults')
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <Card className="border-0 rounded-none flex-1 flex flex-col h-full overflow-hidden">
          {exerciseContent}
        </Card>
      </div>
    );
  }

  return (
    <Card className="border-border/50">
      {exerciseContent}
    </Card>
  );
};