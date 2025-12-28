import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Trophy, RotateCcw, BookOpen, Calendar, Maximize2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
  context?: string;
  date?: string;
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [savedProgress, setSavedProgress] = useState<{
    currentQuestion: number;
    score: number;
    answers: boolean[];
  } | null>(null);

  // Load saved progress on mount
  useEffect(() => {
    if (user && lessonId) {
      loadProgress();
    }
  }, [user, lessonId]);

  const loadProgress = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('lesson_progress')
        .select('quiz_score, quiz_completed')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (data && !data.quiz_completed && data.quiz_score !== null) {
        // Resume from saved progress
        const savedQuestion = Math.min(data.quiz_score, (quizData?.length || 1) - 1);
        setSavedProgress({
          currentQuestion: savedQuestion,
          score: 0,
          answers: []
        });
      }
    } catch (error) {
      console.error('Error loading quiz progress:', error);
    }
  };

  const saveProgress = async (questionIndex: number, currentScore: number) => {
    if (!user) return;
    
    try {
      await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          quiz_score: questionIndex,
          quiz_completed: false,
        }, { onConflict: 'user_id,lesson_id' });
    } catch (error) {
      console.error('Error saving quiz progress:', error);
    }
  };

  const handleResumeProgress = () => {
    if (savedProgress) {
      setCurrentQuestion(savedProgress.currentQuestion);
      setSavedProgress(null);
    }
  };

  const handleStartFresh = () => {
    setSavedProgress(null);
    setCurrentQuestion(0);
  };

  if (!quizData || quizData.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">{t('quiz.notAvailable')}</p>
        </CardContent>
      </Card>
    );
  }

  // Show resume dialog if there's saved progress
  if (savedProgress && savedProgress.currentQuestion > 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center space-y-6">
          <BookOpen className="h-12 w-12 text-primary mx-auto" />
          <h2 className="text-xl font-bold">{t('quiz.savedProgress')}</h2>
          <p className="text-muted-foreground">
            {t('quiz.resumeFrom')} {savedProgress.currentQuestion + 1} {t('quiz.of')} {quizData.length}.
          </p>
          <div className="flex justify-center gap-4">
            <Button onClick={handleResumeProgress}>
              {t('quiz.resume')}
            </Button>
            <Button variant="outline" onClick={handleStartFresh}>
              {t('exercises.restart')}
            </Button>
          </div>
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
    
    // Save progress after each question
    saveProgress(currentQuestion, score + (isCorrect ? 1 : 0));
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
      const bonusPoints = percentage === 100 ? 25 : Math.round(percentage / 5);

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

  const quizContent = (
    <>
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">
            {t('quiz.question')} {currentQuestion + 1} {t('quiz.of')} {quizData.length}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {t('quiz.score')}: {score}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="flex-1 overflow-auto">
        {completed ? (
          <div className="py-12 text-center">
            <div className="flex justify-center mb-6">
              <div className={`flex h-20 w-20 items-center justify-center rounded-full ${
                (score / quizData.length) * 100 === 100 ? 'bg-success/20 text-success' : 'bg-accent/20 text-accent'
              }`}>
                <Trophy className="h-10 w-10" />
              </div>
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">
              {t('quiz.complete')}
            </h2>
            <p className="text-4xl font-bold text-foreground mb-2">
              {score} / {quizData.length}
            </p>
            <p className="text-muted-foreground mb-4">
              {Math.round((score / quizData.length) * 100)}% correct
            </p>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              {(score / quizData.length) * 100 === 100 ? t('quiz.perfect') :
               (score / quizData.length) * 100 >= 80 ? t('quiz.excellent') :
               (score / quizData.length) * 100 >= 60 ? t('quiz.good') :
               t('quiz.keepStudying')}
            </p>
            <Button onClick={handleRetry} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('quiz.retry')}
            </Button>
          </div>
        ) : (
          <>
            {/* Context/Date if available */}
            {(question.context || question.date) && (
              <div className="mb-4 p-3 bg-secondary/30 rounded-lg text-sm">
                {question.date && (
                  <p className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <strong>{question.date}</strong>
                  </p>
                )}
                {question.context && (
                  <p className="text-muted-foreground">{question.context}</p>
                )}
              </div>
            )}

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

            {/* Explanation after answering */}
            {showResult && question.explanation && (
              <div className="mt-4 p-4 bg-secondary/30 rounded-lg border">
                <p className="text-sm font-medium mb-1">{t('quiz.explanation')}:</p>
                <p className="text-sm text-muted-foreground">{question.explanation}</p>
              </div>
            )}

            <div className="flex justify-end mt-6 gap-3">
              {!showResult ? (
                <Button 
                  onClick={handleSubmit}
                  disabled={selectedAnswer === null}
                  size="lg"
                >
                  {t('quiz.submit')}
                </Button>
              ) : (
                <Button onClick={handleNext} size="lg">
                  {currentQuestion < quizData.length - 1 ? t('quiz.next') : t('quiz.seeResults')}
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <Card className="border-0 rounded-none flex-1 flex flex-col h-full overflow-hidden">
          {quizContent}
        </Card>
      </div>
    );
  }

  return (
    <Card className="border-border/50">
      {quizContent}
    </Card>
  );
};
