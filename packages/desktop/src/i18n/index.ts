import { en } from './locales/en';
import { it } from './locales/it';

export type Locale = 'en' | 'it';

export const translations = {
  en,
  it,
};

export const SUPPORTED_LOCALES: Locale[] = ['en', 'it'];

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  it: 'Italiano',
};

export const DEFAULT_LOCALE: Locale = 'en';
