import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Brain,
  MessageSquare,
  Target,
  CheckCircle,
  Loader2,
  Download,
  PenLine,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LessonQuiz } from '@/components/lesson/LessonQuiz';
import { LessonMindmap } from '@/components/lesson/LessonMindmap';
import { LessonChat } from '@/components/lesson/LessonChat';
import { LessonExercises } from '@/components/lesson/LessonExercises';
import { BadgeModal } from '@/components/badges/BadgeModal';
import { exportLessonToPDF } from '@/utils/pdfExport';
import { useStreak } from '@/hooks/useStreak';

interface LessonData {
  id: string;
  title: string;
  content: string | null;
  order_index: number;
  is_completed: boolean;
  quiz_data: any;
  mindmap_data: any;
  course_id: string;
}

interface CourseInfo {
  id: string;
  title: string;
  total_lessons: number;
  language: string | null;
}

const Lesson: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updateStreak } = useStreak();
  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [lessons, setLessons] = useState<{ id: string; order_index: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [showBadgeModal, setShowBadgeModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && lessonId) {
      fetchLesson();
    }
  }, [user, lessonId]);

  // Translate content when language changes
  useEffect(() => {
    if (lesson && course) {
      const courseLanguage = course.language || 'en';
      if (language !== courseLanguage) {
        translateContent();
      } else {
        setTranslatedContent(null);
      }
    }
  }, [language, lesson, course]);

  const fetchLesson = async () => {
    try {
      const { data: lessonData, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .maybeSingle();

      if (error) throw error;
      if (!lessonData) {
        navigate('/dashboard');
        return;
      }

      setLesson(lessonData);

      const { data: courseData } = await supabase
        .from('courses')
        .select('id, title, total_lessons, language')
        .eq('id', lessonData.course_id)
        .maybeSingle();

      if (courseData) {
        setCourse(courseData);
      }

      const { data: allLessons } = await supabase
        .from('lessons')
        .select('id, order_index')
        .eq('course_id', lessonData.course_id)
        .order('order_index', { ascending: true });

      if (allLessons) {
        setLessons(allLessons);
      }
    } catch (error) {
      console.error('Error fetching lesson:', error);
    } finally {
      setLoading(false);
    }
  };

  const translateContent = async () => {
    if (!lesson || translating) return;
    
    setTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-content', {
        body: {
          title: lesson.title,
          content: lesson.content,
          targetLanguage: language,
        },
      });

      if (error) throw error;
      
      if (data?.title && data?.content) {
        setTranslatedContent({
          title: data.title,
          content: data.content,
        });
      }
    } catch (error) {
      console.error('Translation error:', error);
      // Silently fail - show original content
    } finally {
      setTranslating(false);
    }
  };

  const handleComplete = async () => {
    if (!lesson || !user) return;

    setCompleting(true);
    try {
      await supabase
        .from('lessons')
        .update({ is_completed: true, points_earned: 10 })
        .eq('id', lesson.id);

      await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lesson.id,
          is_completed: true,
          points_earned: 10,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,lesson_id' });

      if (course) {
        const { data: completedLessons } = await supabase
          .from('lessons')
          .select('id')
          .eq('course_id', course.id)
          .eq('is_completed', true);

        const completedCount = (completedLessons?.length || 0);

        await supabase
          .from('courses')
          .update({ 
            completed_lessons: completedCount,
            status: completedCount >= course.total_lessons ? 'completed' : 'in_progress'
          })
          .eq('id', course.id);

        const { data: profile } = await supabase
          .from('profiles')
          .select('total_points')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile) {
          await supabase
            .from('profiles')
            .update({ total_points: (profile.total_points || 0) + 10 })
            .eq('user_id', user.id);
        }
      }

      // Update streak
      await updateStreak();

      setLesson({ ...lesson, is_completed: true });
      
      // Show badge modal
      setShowBadgeModal(true);
      
      toast({
        title: t('points.lessonComplete'),
        description: '+10 ' + t('points.earned'),
      });
    } catch (error) {
      console.error('Error completing lesson:', error);
    } finally {
      setCompleting(false);
    }
  };

  const handleExportPDF = () => {
    if (!lesson || !course) return;
    
    exportLessonToPDF(
      {
        title: translatedContent?.title || lesson.title,
        content: translatedContent?.content || lesson.content,
        order_index: lesson.order_index,
      },
      course.title
    );
    
    toast({
      title: 'PDF exported',
      description: 'The file has been downloaded.',
    });
  };

  const currentIndex = lessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const displayTitle = translatedContent?.title || lesson?.title || '';
  const displayContent = translatedContent?.content || lesson?.content || '';

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!lesson) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(`/course/${lesson.course_id}`)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {course?.title || t('common.back')}
        </Button>

        {/* Lesson Header */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {t('course.lesson')} {lesson.order_index}
              </span>
              {lesson.is_completed && (
                <span className="flex items-center gap-1 text-sm text-success">
                  <CheckCircle className="h-4 w-4" />
                  {t('course.completed')}
                </span>
              )}
              {translating && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Translating...
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            {displayTitle}
          </h1>
        </div>

        {/* Lesson Tabs */}
        <Tabs defaultValue="content" className="animate-fade-in-up">
          <TabsList className="mb-6">
            <TabsTrigger value="content" className="gap-2">
              <BookOpen className="h-4 w-4" />
              {t('lesson.content')}
            </TabsTrigger>
            <TabsTrigger value="exercises" className="gap-2">
              <PenLine className="h-4 w-4" />
              {t('lesson.exercises')}
            </TabsTrigger>
            <TabsTrigger value="quiz" className="gap-2">
              <Target className="h-4 w-4" />
              {t('course.quiz')}
            </TabsTrigger>
            <TabsTrigger value="mindmap" className="gap-2">
              <Brain className="h-4 w-4" />
              {t('course.mindmap')}
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              {t('course.chat')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content">
            <Card className="border-border/50">
              <CardContent className="pt-6 prose prose-slate dark:prose-invert max-w-none">
                {displayContent ? (
                  <div className="space-y-4">
                    {displayContent.split(/\n\n+/).map((paragraph, index) => (
                      <p key={index} className="text-foreground leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Loading lesson content...</p>
                )}
              </CardContent>
            </Card>

            {!lesson.is_completed && (
              <div className="mt-6 text-center">
                <Button 
                  onClick={handleComplete}
                  disabled={completing}
                  size="lg"
                  className="bg-success hover:bg-success/90"
                >
                  {completing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {t('lesson.markComplete')}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="exercises">
            <LessonExercises 
              exercises={null}
              lessonContent={displayContent}
            />
          </TabsContent>

          <TabsContent value="quiz">
            <LessonQuiz 
              lessonId={lesson.id} 
              quizData={lesson.quiz_data} 
            />
          </TabsContent>

          <TabsContent value="mindmap">
            <LessonMindmap 
              mindmapData={lesson.mindmap_data} 
            />
          </TabsContent>

          <TabsContent value="chat">
            <LessonChat 
              lessonId={lesson.id}
              lessonTitle={displayTitle}
              lessonContent={displayContent}
            />
          </TabsContent>
        </Tabs>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => prevLesson && navigate(`/lesson/${prevLesson.id}`)}
            disabled={!prevLesson}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('course.prevLesson')}
          </Button>
          <Button
            onClick={() => nextLesson && navigate(`/lesson/${nextLesson.id}`)}
            disabled={!nextLesson}
          >
            {t('course.nextLesson')}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Badge Modal */}
      <BadgeModal
        open={showBadgeModal}
        onOpenChange={setShowBadgeModal}
        badgeName={t('badges.lessonComplete')}
        badgeDescription={t('badges.lessonCompleteDesc')}
        lessonTitle={displayTitle}
        pointsEarned={10}
      />
    </div>
  );
};

export default Lesson;
