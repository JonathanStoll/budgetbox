import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { en, type Translations } from '@/locales/en';
import { es } from '@/locales/es';

export type Language = 'en' | 'es';

const STORAGE_KEY = 'app_language';
const TRANSLATIONS: Record<Language, Translations> = { en, es };

type LanguageContextType = {
  lang: Translations;
  language: Language;
  setLanguage: (l: Language) => Promise<void>;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: en,
  language: 'en',
  setLanguage: async () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'en' || stored === 'es') {
        setLanguageState(stored);
      }
    });
  }, []);

  async function setLanguage(l: Language) {
    setLanguageState(l);
    await AsyncStorage.setItem(STORAGE_KEY, l);
  }

  return (
    <LanguageContext.Provider value={{ lang: TRANSLATIONS[language], language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
