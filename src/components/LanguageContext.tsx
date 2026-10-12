import { createContext, useContext } from 'react';
import type { AppLanguage } from '../services/i18n';
import { translateUi } from '../services/i18n';

export const LanguageContext = createContext<AppLanguage>('en');

export const useTranslate = () => {
  const language = useContext(LanguageContext);
  return (text: string) => translateUi(text, language);
};
