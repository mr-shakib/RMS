import { useUIStore } from '@/store/uiStore';
import { translations } from '@/i18n';

/**
 * Custom hook for accessing translations
 * Usage: const t = useTranslation();
 * Then: t('sidebar.tables') or t('common.save')
 */
export function useTranslation() {
  const locale = useUIStore((state) => state.locale);
  const currentTranslations = translations[locale];

  /**
   * Get translation by key path (e.g., 'sidebar.tables' or 'common.save')
   * Supports nested keys with dot notation
   */
  const t = (key: string, replacements?: Record<string, string | number>): string => {
    const keys = key.split('.');
    let value: any = currentTranslations;

    // Navigate through nested object
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Return key if translation not found
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    // Handle string replacements (e.g., {min}, {max})
    if (typeof value === 'string' && replacements) {
      return value.replace(/\{(\w+)\}/g, (match, key) => {
        return replacements[key]?.toString() || match;
      });
    }

    return typeof value === 'string' ? value : key;
  };

  return { t, locale };
}

/**
 * Format currency based on current locale
 */
export function useFormatCurrency() {
  const locale = useUIStore((state) => state.locale);

  return (amount: number, currency: string = 'EUR'): string => {
    // Use Italian locale formatting for Italian language
    const localeString = locale === 'it' ? 'it-IT' : 'en-US';
    
    return new Intl.NumberFormat(localeString, {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };
}

/**
 * Format date based on current locale
 */
export function useFormatDate() {
  const locale = useUIStore((state) => state.locale);

  return (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const localeString = locale === 'it' ? 'it-IT' : 'en-US';
    
    return new Intl.DateTimeFormat(localeString, options).format(dateObj);
  };
}

/**
 * Format time based on current locale
 */
export function useFormatTime() {
  const locale = useUIStore((state) => state.locale);

  return (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const localeString = locale === 'it' ? 'it-IT' : 'en-US';
    
    return new Intl.DateTimeFormat(localeString, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  };
}
