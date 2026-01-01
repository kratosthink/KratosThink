/**
 * Language Context - Simplified for English-only
 * Note: Translation system removed - app is English only
 */
import React, { createContext, useContext, ReactNode } from 'react';

// Static English translations
const translations: Record<string, string> = {
  // Navigation
  'nav.home': 'Home',
  'nav.dashboard': 'Dashboard',
  'nav.login': 'Sign In',
  'nav.signup': 'Sign Up',
  'nav.logout': 'Log out',
  
  // Home
  'home.title': 'Learn Anything with AI',
  'home.subtitle': 'Generate personalized courses on any topic. Powered by artificial intelligence.',
  'home.searchPlaceholder': 'Enter a topic to learn...',
  'home.generateCourse': 'Generate Course',
  
  // Auth
  'auth.login': 'Sign In',
  'auth.signup': 'Create Account',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.name': 'Full Name',
  'auth.noAccount': "Don't have an account?",
  'auth.hasAccount': 'Already have an account?',
  
  // Dashboard
  'dashboard.welcome': 'Welcome',
  'dashboard.stats.courses': 'Courses',
  'dashboard.stats.completed': 'Completed',
  'dashboard.stats.points': 'Points',
  'dashboard.stats.streak': 'Day Streak',
  'dashboard.recentCourses': 'Your Courses',
  'dashboard.newCourse': 'New Course',
  'dashboard.upcomingRevisions': 'Upcoming Revisions',
  'dashboard.today': 'Today',
  'dashboard.tomorrow': 'Tomorrow',
  'dashboard.noCourses': "You don't have any courses yet",
  'dashboard.createFirst': 'Create my first course',
  'dashboard.pointsProgress': 'Points Progress',
  
  // Course
  'course.lessons': 'lessons',
  'course.lesson': 'Lesson',
  'course.completed': 'Completed',
  'course.inProgress': 'In Progress',
  'course.startLesson': 'Start Lesson',
  'course.continueLesson': 'Continue',
  'course.quiz': 'Quiz',
  'course.mindmap': 'Mind Map',
  'course.chat': 'AI Assistant',
  'course.prevLesson': 'Previous Lesson',
  'course.nextLesson': 'Next Lesson',
  
  // Lesson
  'lesson.content': 'Content',
  'lesson.exercises': 'Exercises',
  'lesson.markComplete': 'Mark as Complete',
  'lesson.highlight': 'Highlight Color',
  
  // Quiz
  'quiz.question': 'Question',
  'quiz.submit': 'Submit Answer',
  'quiz.next': 'Next Question',
  'quiz.correct': 'Correct!',
  'quiz.incorrect': 'Incorrect',
  'quiz.score': 'Your Score',
  'quiz.restart': 'Restart Quiz',
  'quiz.noQuiz': 'No quiz available for this lesson',
  
  // Exercises
  'exercises.title': 'Practice Exercises',
  'exercises.question': 'Question',
  'exercises.answer': 'Your answer...',
  'exercises.submit': 'Submit',
  'exercises.grading': 'AI Grading',
  'exercises.score': 'Score',
  'exercises.feedback': 'Feedback',
  'exercises.keyPoints': 'Key Points',
  'exercises.generating': 'Generating exercises...',
  'exercises.noExercises': 'No exercises available',
  
  // Chat
  'chat.placeholder': 'Ask me anything about this lesson...',
  'chat.send': 'Send',
  
  // Points/Rewards
  'points.earned': 'points earned',
  'points.lessonComplete': 'Lesson Completed!',
  
  // Badges
  'badges.lessonComplete': 'Lesson Master',
  'badges.lessonCompleteDesc': 'You completed a lesson!',
  
  // Master
  'master.select': 'Select as Master',
  'master.selected': 'Master Course',
  'master.title': 'Master Selection',
  'master.description': 'Choose this course as your Master to become an expert. Complete all lessons and quizzes to earn your KratosThink certification!',
  'master.requirements': 'Requirements: 200+ points',
  'master.confirm': 'Confirm Selection',
  'master.alreadySelected': 'You already have a Master course',
  'master.certified': 'Certified Expert',
  
  // Common
  'common.loading': 'Loading...',
  'common.error': 'Error',
  'common.success': 'Success',
  'common.back': 'Back',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.confirm': 'Confirm',
  
  // Generation modal
  'generation.selectLevel': 'Select Difficulty Level',
  'generation.selectLessons': 'Number of Lessons',
  'generation.beginner': 'Beginner',
  'generation.intermediate': 'Intermediate',
  'generation.advanced': 'Advanced',
  'generation.expert': 'Expert',
  'generation.generate': 'Generate Course',
};

interface LanguageContextType {
  language: string;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const t = (key: string): string => {
    return translations[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language: 'en', t, isRTL: false }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
