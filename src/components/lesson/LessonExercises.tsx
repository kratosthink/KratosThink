import React, { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, PenTool, ArrowRight, Maximize2, X, Lightbulb, BookOpen, RotateCcw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Exercise {
  type: 'fill-blank' | 'short-answer' | 'true-false';
  question: string;
  instruction?: string;
  blanks?: string[];
  correctAnswer?: boolean;
  hint?: string;
  explanation?: string;
}

interface LessonExercisesProps {
  lessonContent: string;
}

export const LessonExercises: React.FC<LessonExercisesProps> = ({ lessonContent }) => {
  const { t } = useLanguage();
  const [currentExercise, setCurrentExercise] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [trueFalseAnswers, setTrueFalseAnswers] = useState<Record<number, boolean | null>>({});
  const [showResults, setShowResults] = useState<Record<number, boolean>>({});
  const [showHint, setShowHint] = useState<Record<number, boolean>>({});
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Génération automatique des exercices à partir du contenu
  const generateExercisesFromContent = (content: string): Exercise[] => {
    const lines = content.split('.').filter(l => l.trim().length > 0);
    const exercises: Exercise[] = [];

    // 1. Short-answer : résumé personnel
    exercises.push({
      type: 'short-answer',
      question: 'Quelles sont les choses les plus importantes que vous avez retenues de ce cours ?',
      instruction: 'Rédigez une réponse complète d’au moins 3 phrases qui résume les points clés.',
      hint: 'Pensez aux concepts principaux et aux idées que vous pourriez expliquer à quelqu’un d’autre.',
      explanation: 'Écrire un résumé aide à mémoriser et comprendre le cours.'
    });

    // 2. Fill in the blank : premières phrases du cours
    lines.slice(0, 3).forEach((line, idx) => {
      const words = line.split(' ');
      if (words.length > 4) {
        const missing = words[3]; // 4e mot à compléter
        const blankLine = line.replace(missing, '__________');
        exercises.push({
          type: 'fill-blank',
          question: blankLine,
          blanks: [missing],
          hint: 'Complétez le mot manquant à partir du contexte.',
          explanation: `Le mot correct était "${missing}".`
        });
      }
    });

    // 3. True/False : assertions simples basées sur le cours
    exercises.push({
      type: 'true-false',
      question: 'Le cours contient des concepts importants.',
      correctAnswer: true,
      hint: 'Relisez le cours pour vérifier cette affirmation.',
      explanation: 'Oui, le cours explique les concepts essentiels à retenir.'
    });

    exercises.push({
      type: 'true-false',
      question: 'Ce cours ne sert à rien.',
      correctAnswer: false,
      hint: 'Réfléchissez aux objectifs du cours.',
      explanation: 'Faux, le cours fournit des connaissances utiles.'
    });

    return exercises;
  };

  const exerciseList = generateExercisesFromContent(lessonContent);
  const exercise = exerciseList[currentExercise];
  const progress = ((currentExercise + 1) / exerciseList.length) * 100;

  const checkAnswer = (): boolean => {
    switch (exercise.type) {
      case 'fill-blank':
        return exercise.blanks?.some(b => b.toLowerCase() === userAnswers[currentExercise]?.toLowerCase().trim()) || false;
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
    if (checkAnswer()) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (currentExercise < exerciseList.length - 1) setCurrentExercise(currentExercise + 1);
    else setCompleted(true);
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

  const toggleHint = () => setShowHint(prev => ({ ...prev, [currentExercise]: !prev[currentExercise] }));
  const canSubmit = (): boolean => {
    switch (exercise.type) {
      case 'fill-blank':
      case 'short-answer': return !!userAnswers[currentExercise]?.trim();
      case 'true-false': return trueFalseAnswers[currentExercise] !== undefined && trueFalseAnswers[currentExercise] !== null;
      default: return false;
    }
  };

  // Le reste du rendu reprend la structure du composant existant
  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">{t('exercises.exercise')} {currentExercise + 1} / {exerciseList.length}</span>
          <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent>
        {completed ? (
          <div className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
            <p className="text-2xl font-bold">{t('exercises.completed')}</p>
            <p className="text-xl">{score} / {exerciseList.length}</p>
            <Button onClick={handleRetry} variant="outline" className="mt-4"><RotateCcw className="h-4 w-4 mr-2" />{t('exercises.restart')}</Button>
          </div>
        ) : (
          <>
            {exercise.instruction && <div className="p-2 bg-primary/10 rounded mb-2"><p className="text-sm">{exercise.instruction}</p></div>}
            <p className="mb-4 font-medium">{exercise.question}</p>

            {exercise.type === 'fill-blank' && (
              <div className="space-y-2">
                <Input value={userAnswers[currentExercise] || ''} onChange={e => setUserAnswers({...userAnswers, [currentExercise]: e.target.value})} disabled={showResults[currentExercise]} />
                {showResults[currentExercise] && exercise.blanks && (
                  <div className="text-sm">
                    {checkAnswer() ? <span className="text-success">✔ {t('quiz.correct')}</span> : <span className="text-destructive">✖ {t('exercises.correctAnswerWas')}: {exercise.blanks.join(', ')}</span>}
                    {exercise.explanation && <p className="text-muted">{exercise.explanation}</p>}
                  </div>
                )}
              </div>
            )}

            {exercise.type === 'true-false' && (
              <div className="flex gap-4 mb-2">
                <Button onClick={() => !showResults[currentExercise] && setTrueFalseAnswers({...trueFalseAnswers, [currentExercise]: true})} disabled={showResults[currentExercise]}>True</Button>
                <Button onClick={() => !showResults[currentExercise] && setTrueFalseAnswers({...trueFalseAnswers, [currentExercise]: false})} disabled={showResults[currentExercise]}>False</Button>
                {showResults[currentExercise] && exercise.explanation && <p className="text-sm mt-2">{exercise.explanation}</p>}
              </div>
            )}

            {exercise.type === 'short-answer' && (
              <div className="mb-2">
                <Textarea rows={5} value={userAnswers[currentExercise] || ''} onChange={e => setUserAnswers({...userAnswers, [currentExercise]: e.target.value})} disabled={showResults[currentExercise]} />
                {showResults[currentExercise] && exercise.explanation && <p className="text-sm mt-2">{exercise.explanation}</p>}
              </div>
            )}

            {exercise.hint && !showResults[currentExercise] && <Button variant="ghost" size="sm" onClick={toggleHint} className="mt-2"><Lightbulb className="h-4 w-4 mr-1" />{showHint[currentExercise] ? t('exercises.hideHint') : t('exercises.showHint')}</Button>}
            {showHint[currentExercise] && <p className="text-sm text-muted mt-1">{exercise.hint}</p>}

            <div className="flex justify-end gap-2 mt-4">
              {!showResults[currentExercise] ? <Button onClick={handleSubmitAnswer} disabled={!canSubmit()}>{t('quiz.submit')}</Button> : <Button onClick={handleNext}>{currentExercise < exerciseList.length - 1 ? t('common.next') : t('exercises.seeResults')}</Button>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
