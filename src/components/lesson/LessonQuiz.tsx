import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Trophy, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
}

interface LessonQuizProps {
  lessonId: string;
  quizData: QuizQuestion[] | null;
}

export const LessonQuiz: React.FC<LessonQuizProps> = ({ lessonId, quizData }) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [completed, setCompleted] = useState(false);

  if (!quizData || quizData.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Quiz non disponible pour cette leçon</p>
        </CardContent>
      </Card>
    );
  }

  const question = quizData[currentQuestion];
  const progress = ((currentQuestion + 1) / quizData.length) * 100;

  const handleSubmit = () => {
    if (selectedAnswer === null) return;

    const isCorrect = selectedAnswer === question.correct;
    setShowResult(true);
    
    if (isCorrect) {
      setScore(score + 1);
    }
    setAnswers([...answers, isCorrect]);
  };

  const handleNext = async () => {
    if (currentQuestion < quizData.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Quiz completed
      setCompleted(true);
      const finalScore = score + (selectedAnswer === question.correct ? 1 : 0);
      const percentage = (finalScore / quizData.length) * 100;
      const bonusPoints = percentage === 100 ? 20 : Math.round(percentage / 10);

      if (user) {
        try {
          await supabase
            .from('lesson_progress')
            .upsert({
              user_id: user.id,
              lesson_id: lessonId,
              quiz_completed: true,
              quiz_score: finalScore,
              points_earned: bonusPoints,
            }, { onConflict: 'user_id,lesson_id' });
        } catch (error) {
          console.error('Error saving quiz progress:', error);
        }
      }

      if (percentage === 100) {
        toast({
          title: t('points.perfectQuiz'),
          description: `+${bonusPoints} ${t('points.earned')}`,
        });
      }
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setAnswers([]);
    setCompleted(false);
  };

  if (completed) {
    const finalScore = score;
    const percentage = (finalScore / quizData.length) * 100;

    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <div className="flex justify-center mb-6">
            <div className={`flex h-20 w-20 items-center justify-center rounded-full ${
              percentage === 100 ? 'bg-success/20 text-success' : 'bg-accent/20 text-accent'
            }`}>
              <Trophy className="h-10 w-10" />
            </div>
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">
            {t('quiz.complete')}
          </h2>
          <p className="text-4xl font-bold text-foreground mb-2">
            {finalScore} / {quizData.length}
          </p>
          <p className="text-muted-foreground mb-6">
            {Math.round(percentage)}% correct
          </p>
          <Button onClick={handleRetry} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('quiz.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">
            {t('quiz.question')} {currentQuestion + 1} {t('quiz.of')} {quizData.length}
          </span>
          <span className="text-sm font-medium">
            {t('quiz.score')}: {score}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent>
        <h3 className="font-medium text-lg mb-6">
          {question.question}
        </h3>

        <RadioGroup 
          value={selectedAnswer?.toString()} 
          onValueChange={(v) => !showResult && setSelectedAnswer(parseInt(v))}
          className="space-y-3"
        >
          {question.options.map((option, index) => {
            let optionClass = 'border-border/50';
            if (showResult) {
              if (index === question.correct) {
                optionClass = 'border-success bg-success/10';
              } else if (index === selectedAnswer && index !== question.correct) {
                optionClass = 'border-destructive bg-destructive/10';
              }
            }

            return (
              <div
                key={index}
                className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors ${optionClass} ${
                  !showResult && 'hover:bg-secondary/50 cursor-pointer'
                }`}
                onClick={() => !showResult && setSelectedAnswer(index)}
              >
                <RadioGroupItem 
                  value={index.toString()} 
                  id={`option-${index}`}
                  disabled={showResult}
                />
                <Label 
                  htmlFor={`option-${index}`} 
                  className="flex-1 cursor-pointer"
                >
                  {option}
                </Label>
                {showResult && index === question.correct && (
                  <CheckCircle className="h-5 w-5 text-success" />
                )}
                {showResult && index === selectedAnswer && index !== question.correct && (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
              </div>
            );
          })}
        </RadioGroup>

        <div className="flex justify-end mt-6 gap-3">
          {!showResult ? (
            <Button 
              onClick={handleSubmit}
              disabled={selectedAnswer === null}
            >
              {t('quiz.submit')}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              {currentQuestion < quizData.length - 1 ? t('quiz.next') : 'Voir résultats'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
