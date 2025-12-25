import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, translations, rtlLanguages, TranslationKey } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('learnai-language');
    if (saved && saved in translations) {
      return saved as Language;
    }
    // Try to detect browser language
    const browserLang = navigator.language.split('-')[0] as Language;
    if (browserLang in translations) {
      return browserLang;
    }
    return 'fr';
  });

  const isRTL = rtlLanguages.includes(language);

  useEffect(() => {
    localStorage.setItem('learnai-language', language);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, isRTL]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: TranslationKey): string => {
    const translation = translations[language]?.[key];
    if (!translation) {
      console.warn(`Missing translation for key: ${key} in language: ${language}`);
      return translations.en[key] || key;
    }
    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
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
