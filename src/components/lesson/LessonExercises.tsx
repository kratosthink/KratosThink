import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, PenTool, ArrowRight, RotateCcw, Lightbulb, BookOpen, Maximize2, X } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Exercise {
  type: 'fill-blank' | 'short-answer' | 'matching' | 'true-false' | 'ordering';
  question: string;
  instruction?: string;
  answer?: string;
  blanks?: string[];
  correctAnswer?: boolean;
  pairs?: { left: string; right: string }[];
  items?: string[];
  correctOrder?: number[];
  hint?: string;
  explanation?: string;
}

interface LessonExercisesProps {
  exercises: Exercise[] | null;
}

export const LessonExercises: React.FC<LessonExercisesProps> = ({ exercises }) => {
  const { t } = useLanguage();
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [trueFalseAnswers, setTrueFalseAnswers] = useState<Record<number, boolean | null>>({});
  const [showResults, setShowResults] = useState<Record<number, boolean>>({});
  const [showHint, setShowHint] = useState<Record<number, boolean>>({});
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Enhanced default exercises - NO multiple-choice (QCM)
  const defaultExercises: Exercise[] = [
    {
      type: 'fill-blank',
      question: 'La ____________ est essentielle pour retenir les informations sur le long terme.',
      instruction: 'Complétez avec le mot qui correspond le mieux au contexte de l\'apprentissage.',
      blanks: ['répétition', 'pratique', 'révision'],
      hint: 'C\'est une action qu\'on fait plusieurs fois pour mieux retenir.',
      explanation: 'La répétition espacée est une technique prouvée scientifiquement pour la mémorisation à long terme.'
    },
    {
      type: 'true-false',
      question: 'L\'apprentissage actif est plus efficace que l\'apprentissage passif.',
      instruction: 'Indiquez si cette affirmation est vraie ou fausse.',
      correctAnswer: true,
      hint: 'Réfléchissez à la différence entre lire et pratiquer.',
      explanation: 'L\'apprentissage actif (pratiquer, questionner, enseigner) engage davantage le cerveau que la lecture passive.'
    },
    {
      type: 'short-answer',
      question: 'Décrivez en quelques phrases ce que vous avez appris de plus important dans cette leçon.',
      instruction: 'Rédigez une réponse complète d\'au moins 3 phrases qui résume les points clés.',
      hint: 'Structurez votre réponse avec une introduction, le contenu principal et une conclusion.',
      explanation: 'L\'écriture aide à consolider les apprentissages en forçant à reformuler les concepts.'
    },
    {
      type: 'fill-blank',
      question: 'Une ____________ mentale permet de visualiser les liens entre les concepts.',
      instruction: 'Trouvez le mot qui désigne un outil visuel d\'organisation des idées.',
      blanks: ['carte', 'map', 'mind map'],
      hint: 'C\'est un schéma qui part d\'une idée centrale.',
      explanation: 'Les cartes mentales (mind maps) sont des outils puissants pour organiser et mémoriser l\'information.'
    },
    {
      type: 'true-false',
      question: 'La mémorisation est plus efficace lorsqu\'on étudie en une seule longue session.',
      instruction: 'Déterminez si cette méthode d\'étude est recommandée.',
      correctAnswer: false,
      hint: 'Pensez à la fatigue cognitive et à la courbe de l\'oubli.',
      explanation: 'Les sessions d\'étude courtes et espacées sont plus efficaces que les longues sessions intensives (effet de spacing).'
    },
    {
      type: 'short-answer',
      question: 'Expliquez comment vous pourriez appliquer les concepts de cette leçon dans votre vie quotidienne.',
      instruction: 'Donnez au moins deux exemples concrets d\'application pratique.',
      hint: 'Pensez à des situations de travail, d\'études ou de vie personnelle.',
      explanation: 'Relier les concepts à des situations réelles renforce la mémorisation et la compréhension.'
    }
  ];

  const exerciseList = exercises && exercises.length > 0 ? exercises : defaultExercises;
  const exercise = exerciseList[currentExercise];
  const progress = ((currentExercise + 1) / exerciseList.length) * 100;

  const checkAnswer = (): boolean => {
    switch (exercise.type) {
      case 'fill-blank':
        if (exercise.blanks) {
          const answer = userAnswers[currentExercise]?.toLowerCase().trim();
          return exercise.blanks.some(b => b.toLowerCase() === answer);
        }
        return false;
      case 'true-false':
        return trueFalseAnswers[currentExercise] === exercise.correctAnswer;
      case 'short-answer':
        return (userAnswers[currentExercise]?.trim().length || 0) > 20;
      default:
        return false;
    }
  };

  const handleSubmitAnswer = () => {
    setShowResults(prev => ({ ...prev, [currentExercise]: true }));
    
    if (checkAnswer()) {
      setScore(s => s + 1);
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
    setTrueFalseAnswers({});
    setShowResults({});
    setShowHint({});
    setCompleted(false);
    setScore(0);
  };

  const toggleHint = () => {
    setShowHint(prev => ({ ...prev, [currentExercise]: !prev[currentExercise] }));
  };

  const canSubmit = (): boolean => {
    switch (exercise.type) {
      case 'fill-blank':
      case 'short-answer':
        return !!userAnswers[currentExercise]?.trim();
      case 'true-false':
        return trueFalseAnswers[currentExercise] !== undefined && trueFalseAnswers[currentExercise] !== null;
      default:
        return false;
    }
  };

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'fill-blank': return t('exercises.fillBlank');
      case 'short-answer': return t('exercises.shortAnswer');
      case 'true-false': return t('exercises.trueFalse');
      case 'matching': return t('exercises.matching');
      case 'ordering': return t('exercises.ordering');
      default: return t('exercises.exercise');
    }
  };

  const exerciseContent = (
    <>
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">
            {t('exercises.exercise')} {currentExercise + 1} {t('quiz.of')} {exerciseList.length}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium px-2 py-1 bg-secondary rounded">
              {getTypeLabel(exercise.type)}
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
        <CardTitle className="text-lg flex items-center gap-2 mt-4">
          <PenTool className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-normal text-muted-foreground">{t('quiz.score')}: {score}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 flex-1 overflow-auto">
        {completed ? (
          <div className="py-12 text-center">
            <div className="flex justify-center mb-6">
              <div className={`flex h-20 w-20 items-center justify-center rounded-full ${
                (score / exerciseList.length) * 100 >= 70 ? 'bg-success/20 text-success' : 'bg-accent/20 text-accent'
              }`}>
                <CheckCircle className="h-10 w-10" />
              </div>
            </div>
            <h2 className="font-display text-2xl font-bold mb-2">
              {t('exercises.completed')}
            </h2>
            <p className="text-4xl font-bold text-foreground mb-2">
              {score} / {exerciseList.length}
            </p>
            <p className="text-muted-foreground mb-4">
              {Math.round((score / exerciseList.length) * 100)}% {t('exercises.success')}
            </p>
            <Button onClick={handleRetry} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              {t('exercises.restart')}
            </Button>
          </div>
        ) : (
          <>
            {/* Instruction */}
            {exercise.instruction && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {exercise.instruction}
                </p>
              </div>
            )}

            {/* Question */}
            <div className="p-4 bg-secondary/30 rounded-lg">
              <p className="font-medium text-foreground mb-4 text-lg">{exercise.question}</p>

              {/* Fill in the blank */}
              {exercise.type === 'fill-blank' && (
                <div className="space-y-4">
                  <Input
                    placeholder={t('exercises.typeAnswer')}
                    value={userAnswers[currentExercise] || ''}
                    onChange={(e) => setUserAnswers(prev => ({ ...prev, [currentExercise]: e.target.value }))}
                    disabled={showResults[currentExercise]}
                    className="max-w-md text-lg"
                  />
                  {showResults[currentExercise] && exercise.blanks && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        {exercise.blanks.some(b => b.toLowerCase() === userAnswers[currentExercise]?.toLowerCase().trim()) ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-success" />
                            <span className="text-success font-medium">{t('quiz.correct')}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 text-destructive" />
                            <span className="text-destructive">
                              {t('exercises.acceptedAnswers')}: <strong>{exercise.blanks.join(', ')}</strong>
                            </span>
                          </>
                        )}
                      </div>
                      {exercise.explanation && (
                        <p className="text-sm text-muted-foreground p-3 bg-background rounded border">{exercise.explanation}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* True/False */}
              {exercise.type === 'true-false' && (
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <Button
                      variant={trueFalseAnswers[currentExercise] === true ? 'default' : 'outline'}
                      onClick={() => !showResults[currentExercise] && setTrueFalseAnswers(prev => ({ ...prev, [currentExercise]: true }))}
                      disabled={showResults[currentExercise]}
                      className={`flex-1 h-12 text-lg ${showResults[currentExercise] && exercise.correctAnswer === true ? 'bg-success hover:bg-success' : ''}`}
                    >
                      {t('exercises.true')}
                    </Button>
                    <Button
                      variant={trueFalseAnswers[currentExercise] === false ? 'default' : 'outline'}
                      onClick={() => !showResults[currentExercise] && setTrueFalseAnswers(prev => ({ ...prev, [currentExercise]: false }))}
                      disabled={showResults[currentExercise]}
                      className={`flex-1 h-12 text-lg ${showResults[currentExercise] && exercise.correctAnswer === false ? 'bg-success hover:bg-success' : ''}`}
                    >
                      {t('exercises.false')}
                    </Button>
                  </div>
                  {showResults[currentExercise] && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {trueFalseAnswers[currentExercise] === exercise.correctAnswer ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-success" />
                            <span className="text-success font-medium">{t('quiz.correct')}</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 text-destructive" />
                            <span className="text-destructive">
                              {t('exercises.correctAnswerWas')}: <strong>{exercise.correctAnswer ? t('exercises.true') : t('exercises.false')}</strong>
                            </span>
                          </>
                        )}
                      </div>
                      {exercise.explanation && (
                        <p className="text-sm text-muted-foreground p-3 bg-background rounded border">{exercise.explanation}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Short answer */}
              {exercise.type === 'short-answer' && (
                <div className="space-y-4">
                  <Textarea
                    placeholder={t('exercises.writeAnswer')}
                    value={userAnswers[currentExercise] || ''}
                    onChange={(e) => setUserAnswers(prev => ({ ...prev, [currentExercise]: e.target.value }))}
                    disabled={showResults[currentExercise]}
                    rows={5}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    {(userAnswers[currentExercise]?.length || 0)} {t('exercises.characters')}
                    {(userAnswers[currentExercise]?.length || 0) < 20 && ` (${t('exercises.minimum')} 20)`}
                  </p>
                  {showResults[currentExercise] && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-5 w-5 text-success" />
                        <span className="text-success font-medium">{t('exercises.answerRecorded')}</span>
                      </div>
                      {exercise.explanation && (
                        <p className="text-sm text-muted-foreground p-3 bg-background rounded border">{exercise.explanation}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hint button */}
            {exercise.hint && !showResults[currentExercise] && (
              <div>
                <Button variant="ghost" size="sm" onClick={toggleHint} className="text-muted-foreground">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  {showHint[currentExercise] ? t('exercises.hideHint') : t('exercises.showHint')}
                </Button>
                {showHint[currentExercise] && (
                  <p className="mt-2 text-sm text-muted-foreground p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    💡 {exercise.hint}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              {!showResults[currentExercise] ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={!canSubmit()}
                  size="lg"
                >
                  {t('quiz.submit')}
                </Button>
              ) : (
                <Button onClick={handleNext} size="lg">
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
          </>
        )}
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
