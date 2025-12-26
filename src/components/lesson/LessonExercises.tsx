import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, PenTool, ArrowRight, RotateCcw } from 'lucide-react';

interface Exercise {
  type: 'fill-blank' | 'short-answer' | 'matching';
  question: string;
  answer?: string;
  blanks?: string[];
  pairs?: { left: string; right: string }[];
}

interface LessonExercisesProps {
  exercises: Exercise[] | null;
}

export const LessonExercises: React.FC<LessonExercisesProps> = ({ exercises }) => {
  const { t } = useLanguage();
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState<Record<number, boolean>>({});
  const [matchingSelections, setMatchingSelections] = useState<Record<string, string>>({});
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);

  // Default exercises if none provided
  const defaultExercises: Exercise[] = [
    {
      type: 'fill-blank',
      question: 'Complétez la phrase avec le mot approprié.',
      blanks: ['concept', 'idée'],
    },
    {
      type: 'short-answer',
      question: 'Expliquez en quelques mots ce que vous avez appris dans cette leçon.',
      answer: '',
    },
  ];

  const exerciseList = exercises && exercises.length > 0 ? exercises : defaultExercises;
  const exercise = exerciseList[currentExercise];

  const handleSubmitAnswer = () => {
    setShowResults(prev => ({ ...prev, [currentExercise]: true }));
    
    // Simple scoring - for fill-blank check if answer matches any blank
    if (exercise.type === 'fill-blank' && exercise.blanks) {
      const answer = userAnswers[currentExercise]?.toLowerCase().trim();
      if (exercise.blanks.some(b => b.toLowerCase() === answer)) {
        setScore(s => s + 1);
      }
    } else if (exercise.type === 'short-answer') {
      // Short answers always get points for completion
      if (userAnswers[currentExercise]?.trim().length > 10) {
        setScore(s => s + 1);
      }
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
    setShowResults({});
    setMatchingSelections({});
    setCompleted(false);
    setScore(0);
  };

  if (completed) {
    const percentage = (score / exerciseList.length) * 100;
    return (
      <Card className="border-border/50">
        <CardContent className="py-12 text-center">
          <div className="flex justify-center mb-6">
            <div className={`flex h-20 w-20 items-center justify-center rounded-full ${
              percentage >= 70 ? 'bg-success/20 text-success' : 'bg-accent/20 text-accent'
            }`}>
              <CheckCircle className="h-10 w-10" />
            </div>
          </div>
          <h2 className="font-display text-2xl font-bold mb-2">
            Exercices terminés !
          </h2>
          <p className="text-4xl font-bold text-foreground mb-2">
            {score} / {exerciseList.length}
          </p>
          <p className="text-muted-foreground mb-6">
            {Math.round(percentage)}% réussi
          </p>
          <Button onClick={handleRetry} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Recommencer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <PenTool className="h-5 w-5 text-muted-foreground" />
          Exercice {currentExercise + 1} sur {exerciseList.length}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 bg-secondary/30 rounded-lg">
          <p className="font-medium text-foreground mb-4">{exercise.question}</p>

          {exercise.type === 'fill-blank' && (
            <div className="space-y-4">
              <Input
                placeholder="Votre réponse..."
                value={userAnswers[currentExercise] || ''}
                onChange={(e) => setUserAnswers(prev => ({ ...prev, [currentExercise]: e.target.value }))}
                disabled={showResults[currentExercise]}
                className="max-w-md"
              />
              {showResults[currentExercise] && exercise.blanks && (
                <div className="flex items-center gap-2 text-sm">
                  {exercise.blanks.some(b => b.toLowerCase() === userAnswers[currentExercise]?.toLowerCase().trim()) ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-success" />
                      <span className="text-success">Correct !</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-destructive">
                        Réponses acceptées : {exercise.blanks.join(', ')}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {exercise.type === 'short-answer' && (
            <div className="space-y-4">
              <Textarea
                placeholder="Écrivez votre réponse ici..."
                value={userAnswers[currentExercise] || ''}
                onChange={(e) => setUserAnswers(prev => ({ ...prev, [currentExercise]: e.target.value }))}
                disabled={showResults[currentExercise]}
                rows={4}
                className="resize-none"
              />
              {showResults[currentExercise] && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-success">Réponse enregistrée !</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          {!showResults[currentExercise] ? (
            <Button 
              onClick={handleSubmitAnswer}
              disabled={!userAnswers[currentExercise]?.trim()}
            >
              Valider
            </Button>
          ) : (
            <Button onClick={handleNext}>
              {currentExercise < exerciseList.length - 1 ? (
                <>
                  Suivant
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                'Voir résultats'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};