import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/i18n/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  BookOpen, 
  User, 
  LogOut, 
  Moon, 
  Sun, 
  Globe,
  Lightbulb,
  Users
} from 'lucide-react';
import { Language, languageNames } from '@/i18n/translations';

export const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Lightbulb className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-foreground tracking-tight">
            KratosThink
          </span>
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-2">
          {/* Community Button */}
          {user && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/feed')}
              className="h-9 w-9"
              title={t('nav.community')}
            >
              <Users className="h-4 w-4" />
            </Button>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="h-9 w-9"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Language Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Globe className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {(Object.keys(languageNames) as Language[]).map((lang) => (
                <DropdownMenuItem
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={language === lang ? 'bg-accent text-accent-foreground' : ''}
                >
                  {languageNames[lang]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Auth Buttons or User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  {t('nav.dashboard')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/feed')}>
                  <Users className="mr-2 h-4 w-4" />
                  {t('nav.community')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                {t('nav.login')}
              </Button>
              <Button onClick={() => navigate('/auth?mode=signup')}>
                {t('nav.signup')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};