import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BookOpen, 
  CheckCircle,
  Circle,
  ArrowLeft,
  Play
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  topic: string;
  total_lessons: number;
  completed_lessons: number;
  status: string;
}

interface LessonData {
  id: string;
  title: string;
  order_index: number;
  is_completed: boolean;
}

const Course: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [lessons, setLessons] = useState<LessonData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user && courseId) {
      fetchCourse();
    }
  }, [user, courseId]);

  const fetchCourse = async () => {
    try {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .maybeSingle();

      if (courseError) throw courseError;
      if (!courseData) {
        navigate('/dashboard');
        return;
      }

      setCourse(courseData);

      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, title, order_index, is_completed')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (lessonsData) {
        setLessons(lessonsData);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  const progress = course && course.total_lessons > 0
    ? (course.completed_lessons / course.total_lessons) * 100
    : 0;

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-96 mb-8" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('common.back')}
        </Button>

        {/* Course Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            {course.title}
          </h1>
          {course.description && (
            <p className="text-muted-foreground mb-4">
              {course.description}
            </p>
          )}
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-md">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{t('dashboard.progress')}</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            <span className="text-sm text-muted-foreground">
              {course.completed_lessons} / {course.total_lessons} {t('course.lessons')}
            </span>
          </div>
        </div>

        {/* Lessons List */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-xl flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {t('course.lessons')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lessons.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Aucune leçon disponible</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lessons.map((lesson, index) => (
                  <div
                    key={lesson.id}
                    onClick={() => navigate(`/lesson/${lesson.id}`)}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card hover:bg-secondary/30 transition-colors cursor-pointer animate-fade-in-up"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      lesson.is_completed 
                        ? 'bg-success text-success-foreground' 
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      {lesson.is_completed ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-medium">{lesson.order_index}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-foreground">
                        {lesson.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {t('course.lesson')} {lesson.order_index}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Course;
