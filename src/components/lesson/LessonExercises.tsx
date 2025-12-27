import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, PenTool, ArrowRight, RotateCcw, Lightbulb, BookOpen } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Exercise {
  type: 'fill-blank' | 'short-answer' | 'matching' | 'multiple-choice' | 'true-false' | 'ordering';
  question: string;
  instruction?: string;
  answer?: string;
  blanks?: string[];
  options?: string[];
  correctOption?: number;
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
  const [selectedOptions, setSelectedOptions] = useState<Record<number, number>>({});
  const [trueFalseAnswers, setTrueFalseAnswers] = useState<Record<number, boolean | null>>({});
  const [showResults, setShowResults] = useState<Record<number, boolean>>({});
  const [showHint, setShowHint] = useState<Record<number, boolean>>({});
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);

  // Enhanced default exercises with more variety and detail
  const defaultExercises: Exercise[] = [
    {
      type: 'multiple-choice',
      question: 'Quelle est la meilleure approche pour comprendre un concept complexe ?',
      instruction: 'Sélectionnez la réponse la plus appropriée parmi les options suivantes.',
      options: [
        'Mémoriser sans comprendre',
        'Décomposer en parties plus simples et les analyser une par une',
        'Ignorer les détails difficiles',
        'Lire rapidement une seule fois'
      ],
      correctOption: 1,
      hint: 'Pensez à la méthode analytique qui permet de simplifier les problèmes.',
      explanation: 'Décomposer un concept complexe en parties plus simples permet une meilleure compréhension et mémorisation.'
    },
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
      type: 'multiple-choice',
      question: 'Quel est l\'avantage principal de la mind map pour l\'apprentissage ?',
      instruction: 'Choisissez la réponse qui décrit le mieux l\'utilité des cartes mentales.',
      options: [
        'Elle permet de visualiser les liens entre les concepts',
        'Elle est plus rapide à lire qu\'un texte',
        'Elle remplace la nécessité de comprendre',
        'Elle est uniquement décorative'
      ],
      correctOption: 0,
      hint: 'Pensez à la structure visuelle et aux connexions.',
      explanation: 'Les mind maps permettent de voir les relations hiérarchiques et associatives entre les idées.'
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
      case 'multiple-choice':
        return selectedOptions[currentExercise] === exercise.correctOption;
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
    setSelectedOptions({});
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
      case 'multiple-choice':
        return selectedOptions[currentExercise] !== undefined;
      case 'true-false':
        return trueFalseAnswers[currentExercise] !== undefined && trueFalseAnswers[currentExercise] !== null;
      default:
        return false;
    }
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
          <p className="text-muted-foreground mb-4">
            {Math.round(percentage)}% réussi
          </p>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            {percentage >= 80 ? 'Excellent travail ! Vous maîtrisez bien ce sujet.' :
             percentage >= 60 ? 'Bon travail ! Quelques points à revoir.' :
             'Continuez à pratiquer pour améliorer votre compréhension.'}
          </p>
          <Button onClick={handleRetry} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Recommencer
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getTypeLabel = (type: string): string => {
    switch (type) {
      case 'fill-blank': return 'Texte à trous';
      case 'short-answer': return 'Réponse libre';
      case 'multiple-choice': return 'QCM';
      case 'true-false': return 'Vrai ou Faux';
      case 'matching': return 'Association';
      case 'ordering': return 'Ordonnancement';
      default: return 'Exercice';
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">
            Exercice {currentExercise + 1} sur {exerciseList.length}
          </span>
          <span className="text-sm font-medium px-2 py-1 bg-secondary rounded">
            {getTypeLabel(exercise.type)}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <CardTitle className="text-lg flex items-center gap-2 mt-4">
          <PenTool className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-normal text-muted-foreground">Score: {score}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
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
                placeholder="Tapez votre réponse..."
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
                        <span className="text-success font-medium">Correct !</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-destructive" />
                        <span className="text-destructive">
                          Réponses acceptées : <strong>{exercise.blanks.join(', ')}</strong>
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

          {/* Multiple choice */}
          {exercise.type === 'multiple-choice' && exercise.options && (
            <div className="space-y-4">
              <RadioGroup
                value={selectedOptions[currentExercise]?.toString()}
                onValueChange={(v) => !showResults[currentExercise] && setSelectedOptions(prev => ({ ...prev, [currentExercise]: parseInt(v) }))}
                className="space-y-3"
              >
                {exercise.options.map((option, index) => {
                  let optionClass = 'border-border/50';
                  if (showResults[currentExercise]) {
                    if (index === exercise.correctOption) {
                      optionClass = 'border-success bg-success/10';
                    } else if (index === selectedOptions[currentExercise] && index !== exercise.correctOption) {
                      optionClass = 'border-destructive bg-destructive/10';
                    }
                  }
                  return (
                    <div
                      key={index}
                      className={`flex items-center space-x-3 p-4 rounded-lg border transition-colors ${optionClass} ${
                        !showResults[currentExercise] && 'hover:bg-secondary/50 cursor-pointer'
                      }`}
                      onClick={() => !showResults[currentExercise] && setSelectedOptions(prev => ({ ...prev, [currentExercise]: index }))}
                    >
                      <RadioGroupItem value={index.toString()} disabled={showResults[currentExercise]} />
                      <Label className="flex-1 cursor-pointer">{option}</Label>
                      {showResults[currentExercise] && index === exercise.correctOption && (
                        <CheckCircle className="h-5 w-5 text-success" />
                      )}
                      {showResults[currentExercise] && index === selectedOptions[currentExercise] && index !== exercise.correctOption && (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  );
                })}
              </RadioGroup>
              {showResults[currentExercise] && exercise.explanation && (
                <p className="text-sm text-muted-foreground p-3 bg-background rounded border">{exercise.explanation}</p>
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
                  Vrai
                </Button>
                <Button
                  variant={trueFalseAnswers[currentExercise] === false ? 'default' : 'outline'}
                  onClick={() => !showResults[currentExercise] && setTrueFalseAnswers(prev => ({ ...prev, [currentExercise]: false }))}
                  disabled={showResults[currentExercise]}
                  className={`flex-1 h-12 text-lg ${showResults[currentExercise] && exercise.correctAnswer === false ? 'bg-success hover:bg-success' : ''}`}
                >
                  Faux
                </Button>
              </div>
              {showResults[currentExercise] && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {trueFalseAnswers[currentExercise] === exercise.correctAnswer ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-success" />
                        <span className="text-success font-medium">Correct !</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-destructive" />
                        <span className="text-destructive">
                          La réponse était : <strong>{exercise.correctAnswer ? 'Vrai' : 'Faux'}</strong>
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
                placeholder="Rédigez votre réponse ici... (minimum 3 phrases)"
                value={userAnswers[currentExercise] || ''}
                onChange={(e) => setUserAnswers(prev => ({ ...prev, [currentExercise]: e.target.value }))}
                disabled={showResults[currentExercise]}
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {(userAnswers[currentExercise]?.length || 0)} caractères 
                {(userAnswers[currentExercise]?.length || 0) < 20 && ' (minimum 20 caractères)'}
              </p>
              {showResults[currentExercise] && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <span className="text-success font-medium">Réponse enregistrée !</span>
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
              {showHint[currentExercise] ? 'Masquer l\'indice' : 'Voir un indice'}
            </Button>
            {showHint[currentExercise] && (
              <p className="text-sm text-muted-foreground mt-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                💡 {exercise.hint}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3">
          {!showResults[currentExercise] ? (
            <Button 
              onClick={handleSubmitAnswer}
              disabled={!canSubmit()}
              size="lg"
            >
              Valider
            </Button>
          ) : (
            <Button onClick={handleNext} size="lg">
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
