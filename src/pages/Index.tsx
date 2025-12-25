import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const Index: React.FC = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchTopic, setSearchTopic] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerateCourse = async () => {
    if (!searchTopic.trim()) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-course', {
        body: { topic: searchTopic, language }
      });

      if (error) throw error;

      if (data?.courseId) {
        toast({
          title: t('common.success'),
          description: 'Cours généré avec succès !',
        });
        navigate(`/course/${data.courseId}`);
      }
    } catch (error) {
      console.error('Error generating course:', error);
      toast({
        title: t('common.error'),
        description: 'Erreur lors de la génération du cours',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section - Minimal and Clean */}
      <section className="relative min-h-[80vh] flex items-center justify-center">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground animate-fade-in-up">
              {t('home.title')}
            </h1>
            <p className="mt-6 text-lg text-muted-foreground animate-fade-in-up leading-relaxed" style={{ animationDelay: '100ms' }}>
              {t('home.subtitle')}
            </p>

            {/* Search Input */}
            <div className="mt-12 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    value={searchTopic}
                    onChange={(e) => setSearchTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateCourse()}
                    placeholder={t('home.searchPlaceholder')}
                    className="pl-12 h-14 text-lg rounded-lg border-border bg-card"
                  />
                </div>
                <Button 
                  onClick={handleGenerateCourse}
                  disabled={generating || !searchTopic.trim()}
                  className="h-14 px-8 text-lg rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    <>
                      {t('home.generateCourse')}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* CTA for non-authenticated users */}
            {!user && (
              <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/auth?mode=signup')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {t('nav.signup')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2024 Thoughts. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;