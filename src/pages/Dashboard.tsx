import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BookOpen, 
  Trophy, 
  Flame, 
  CheckCircle,
  ArrowRight,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  full_name: string | null;
  total_points: number;
  streak_days: number;
}

interface Course {
  id: string;
  title: string;
  topic: string;
  total_lessons: number;
  completed_lessons: number;
  status: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, total_points, streak_days')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      // Fetch courses
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(6);

      if (coursesData) {
        setCourses(coursesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const inProgressCourses = courses.filter(c => c.status === 'in_progress').length;
  const completedCourses = courses.filter(c => c.status === 'completed').length;

  const stats = [
    {
      label: t('dashboard.stats.courses'),
      value: inProgressCourses,
      icon: BookOpen,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      label: t('dashboard.stats.completed'),
      value: completedCourses,
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      label: t('dashboard.stats.points'),
      value: profile?.total_points || 0,
      icon: Trophy,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: t('dashboard.stats.streak'),
      value: profile?.streak_days || 0,
      icon: Flame,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-8">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container py-8">
        {/* Welcome */}
        <div className="mb-8 animate-fade-in">
          <h1 className="font-display text-3xl font-bold text-foreground">
            {t('dashboard.welcome')}, {profile?.full_name || user?.email?.split('@')[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Votre progression d'apprentissage
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <Card 
              key={stat.label} 
              className="border-border/50 animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">
                      {loading ? <Skeleton className="h-9 w-16" /> : stat.value}
                    </p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Courses */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-xl">
              {t('dashboard.recentCourses')}
            </CardTitle>
            <Button onClick={() => navigate('/')} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau cours
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Vous n'avez pas encore de cours
                </p>
                <Button onClick={() => navigate('/')}>
                  Créer mon premier cours
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {courses.map((course, index) => {
                  const progress = course.total_lessons > 0 
                    ? (course.completed_lessons / course.total_lessons) * 100 
                    : 0;

                  return (
                    <div 
                      key={course.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card hover:bg-secondary/30 transition-colors cursor-pointer animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => navigate(`/course/${course.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground truncate">
                          {course.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {course.completed_lessons} / {course.total_lessons} {t('course.lessons')}
                        </p>
                        <div className="mt-2 w-full max-w-xs">
                          <Progress value={progress} className="h-2" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          course.status === 'completed' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-accent/10 text-accent'
                        }`}>
                          {course.status === 'completed' ? t('course.completed') : t('course.inProgress')}
                        </span>
                        <Button variant="ghost" size="icon">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
