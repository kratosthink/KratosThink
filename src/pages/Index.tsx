import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Sparkles, 
  Brain, 
  MessageSquare, 
  Target,
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

  const features = [
    {
      icon: Sparkles,
      title: t('home.features.ai'),
      description: t('home.features.aiDesc'),
    },
    {
      icon: Target,
      title: t('home.features.quiz'),
      description: t('home.features.quizDesc'),
    },
    {
      icon: Brain,
      title: t('home.features.mindmap'),
      description: t('home.features.mindmapDesc'),
    },
    {
      icon: MessageSquare,
      title: t('home.features.chat'),
      description: t('home.features.chatDesc'),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="container py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground animate-fade-in-up">
              {t('home.title')}
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              {t('home.subtitle')}
            </p>

            {/* Search Input */}
            <div className="mt-10 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    value={searchTopic}
                    onChange={(e) => setSearchTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateCourse()}
                    placeholder={t('home.searchPlaceholder')}
                    className="pl-12 h-14 text-lg rounded-xl border-border/50 bg-card shadow-sm"
                  />
                </div>
                <Button 
                  onClick={handleGenerateCourse}
                  disabled={generating || !searchTopic.trim()}
                  className="h-14 px-8 text-lg rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground font-medium"
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
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={feature.title} 
                className="border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent mb-4">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-20">
          <div className="container">
            <Card className="border-0 bg-primary text-primary-foreground overflow-hidden">
              <CardContent className="p-12 text-center">
                <h2 className="font-display text-3xl font-bold mb-4">
                  Prêt à commencer ?
                </h2>
                <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
                  Créez un compte gratuit et commencez à apprendre n'importe quel sujet avec l'aide de l'intelligence artificielle.
                </p>
                <Button 
                  onClick={() => navigate('/auth?mode=signup')}
                  variant="secondary"
                  size="lg"
                  className="text-lg px-8"
                >
                  {t('nav.signup')}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2024 LearnAI. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
