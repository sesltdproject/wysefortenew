import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LanguageCode, TranslationKeys, languages } from './types';
import { en } from './translations/en';
import { zh } from './translations/zh';
import { es } from './translations/es';
import { de } from './translations/de';
import { fr } from './translations/fr';
import { ru } from './translations/ru';
import { ja } from './translations/ja';
import { pt } from './translations/pt';

const translations: Record<LanguageCode, TranslationKeys> = {
  en,
  zh,
  es,
  de,
  fr,
  ru,
  ja,
  pt,
};

const STORAGE_KEY = 'banking-app-language';

interface TranslationContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string) => string;
  languages: typeof languages;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as LanguageCode;
      if (saved && translations[saved]) {
        return saved;
      }
    }
    return 'en';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    // Update document lang attribute for accessibility
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: LanguageCode) => {
    if (translations[lang]) {
      setLanguageState(lang);
    }
  };

  // Translation function that navigates nested keys like "auth.signIn"
  const t = (key: string): string => {
    const keys = key.split('.');
    let result: any = translations[language];
    
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        // Fallback to English if key not found
        result = translations.en;
        for (const fallbackKey of keys) {
          if (result && typeof result === 'object' && fallbackKey in result) {
            result = result[fallbackKey];
          } else {
            console.warn(`Translation key not found: ${key}`);
            return key;
          }
        }
        break;
      }
    }
    
    return typeof result === 'string' ? result : key;
  };

  return React.createElement(
    TranslationContext.Provider,
    { value: { language, setLanguage, t, languages } },
    children
  );
};

export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

export { languages } from './types';
export type { LanguageCode, Language } from './types';
