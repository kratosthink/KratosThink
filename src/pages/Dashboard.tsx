/**
 * Dashboard Page - User's main dashboard with courses, stats, and progress
 * 
 * LOVABLE SERVICES USED:
 * - Lovable Cloud (Supabase) for user data, courses, and progress
 * - Lovable Cloud (Supabase Auth) for user authentication
 */
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  BookOpen, 
  Trophy, 
  Flame, 
  CheckCircle,
  ArrowRight,
  Plus,
  Trash2,
  Loader2,
  CalendarClock,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';

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

interface UpcomingRevision {
  id: string;
  lesson_id: string;
  lesson_title: string;
  revision_date: string;
  course_title: string;
}

// Points milestones for progress bar
const POINTS_MILESTONES = [0, 50, 100, 200, 500, 1000, 2000, 5000];

const Dashboard: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [upcomingRevisions, setUpcomingRevisions] = useState<UpcomingRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      // LOVABLE SERVICE: Supabase Database
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, total_points, streak_days')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }

      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (coursesData) {
        setCourses(coursesData);
      }

      // Fetch upcoming revisions
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: revisionsData } = await supabase
        .from('lesson_revisions')
        .select('id, lesson_id, revision_dates')
        .eq('user_id', user!.id);

      if (revisionsData) {
        const upcoming: UpcomingRevision[] = [];
        for (const rev of revisionsData) {
          const dates = rev.revision_dates as string[];
          const nextDate = dates.find(d => d >= today);
          if (nextDate) {
            const { data: lessonData } = await supabase
              .from('lessons')
              .select('title, course_id')
              .eq('id', rev.lesson_id)
              .maybeSingle();
            
            if (lessonData) {
              const { data: courseData } = await supabase
                .from('courses')
                .select('title')
                .eq('id', lessonData.course_id)
                .maybeSingle();

              upcoming.push({
                id: rev.id,
                lesson_id: rev.lesson_id,
                lesson_title: lessonData.title,
                revision_date: nextDate,
                course_title: courseData?.title || '',
              });
            }
          }
        }
        upcoming.sort((a, b) => a.revision_date.localeCompare(b.revision_date));
        setUpcomingRevisions(upcoming.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    setCourseToDelete(course);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;

    setDeleting(true);
    try {
      await supabase
        .from('lessons')
        .delete()
        .eq('course_id', courseToDelete.id);

      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseToDelete.id);

      if (error) throw error;

      setCourses(prev => prev.filter(c => c.id !== courseToDelete.id));
      
      toast({
        title: 'Course deleted',
        description: `"${courseToDelete.title}" has been deleted.`,
      });
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: 'Error',
        description: 'Could not delete the course.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setCourseToDelete(null);
    }
  };

  // Calculate progress to next milestone
  const currentPoints = profile?.total_points || 0;
  const currentMilestoneIndex = POINTS_MILESTONES.findIndex(m => m > currentPoints) - 1;
  const currentMilestone = POINTS_MILESTONES[Math.max(0, currentMilestoneIndex)];
  const nextMilestone = POINTS_MILESTONES[currentMilestoneIndex + 1] || POINTS_MILESTONES[POINTS_MILESTONES.length - 1];
  const progressToNext = ((currentPoints - currentMilestone) / (nextMilestone - currentMilestone)) * 100;

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
      value: currentPoints,
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
            Your learning progress
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

        {/* Points Progress Bar */}
        <Card className="border-border/50 mb-8">
          <CardHeader>
            <CardTitle className="font-display text-xl flex items-center gap-2">
              <Star className="h-5 w-5 text-warning" />
              {t('dashboard.pointsProgress')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{currentPoints} points</span>
                <span className="text-muted-foreground">Next: {nextMilestone} points</span>
              </div>
              <Progress value={progressToNext} className="h-3" />
              <div className="flex justify-between">
                {POINTS_MILESTONES.slice(0, 6).map((milestone, i) => (
                  <div 
                    key={milestone}
                    className={`text-xs ${currentPoints >= milestone ? 'text-primary font-medium' : 'text-muted-foreground'}`}
                  >
                    {milestone}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Revisions */}
        {upcomingRevisions.length > 0 && (
          <Card className="border-border/50 mb-8">
            <CardHeader>
              <CardTitle className="font-display text-xl flex items-center gap-2">
                <CalendarClock className="h-5 w-5" />
                {t('dashboard.upcomingRevisions')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingRevisions.map((rev) => {
                  const date = parseISO(rev.revision_date);
                  const dateLabel = isToday(date) ? t('dashboard.today') : isTomorrow(date) ? t('dashboard.tomorrow') : format(date, "MMM d");
                  return (
                    <div 
                      key={rev.id}
                      onClick={() => navigate(`/lesson/${rev.lesson_id}`)}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-secondary/30 cursor-pointer"
                    >
                      <div>
                        <p className="font-medium text-foreground">{rev.lesson_title}</p>
                        <p className="text-sm text-muted-foreground">{rev.course_title}</p>
                      </div>
                      <span className={`text-sm px-2 py-1 rounded-full ${isToday(date) ? 'bg-warning/10 text-warning' : 'bg-secondary text-muted-foreground'}`}>
                        {dateLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Courses */}
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-display text-xl">
              {t('dashboard.recentCourses')}
            </CardTitle>
            <Button onClick={() => navigate('/')} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard.newCourse')}
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
                  {t('dashboard.noCourses')}
                </p>
                <Button onClick={() => navigate('/')}>
                  {t('dashboard.createFirst')}
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
                      className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card hover:bg-secondary/30 transition-colors cursor-pointer animate-fade-in-up group"
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
                      <div className="flex items-center gap-2 ml-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          course.status === 'completed' 
                            ? 'bg-success/10 text-success' 
                            : 'bg-accent/10 text-accent'
                        }`}>
                          {course.status === 'completed' ? t('course.completed') : t('course.inProgress')}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteClick(e, course)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this course?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The course "{courseToDelete?.title}" and all its lessons will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
