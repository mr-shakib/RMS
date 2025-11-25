# Internationalization (i18n) Implementation Guide

## Overview

The RMS Desktop application now supports multiple languages (English and Italian). The implementation uses a custom lightweight i18n system built on Zustand state management with no external dependencies.

## Architecture

### File Structure

```
src/
├── i18n/
│   ├── locales/
│   │   ├── en.ts          # English translations
│   │   └── it.ts          # Italian translations
│   └── index.ts           # i18n configuration and exports
├── hooks/
│   └── useTranslation.ts  # Translation hook and utilities
└── store/
    └── uiStore.ts         # Global state with locale persistence
```

## Features

- **Language Switching**: Users can switch between English and Italian in Settings
- **Persistent Storage**: Language preference is saved in localStorage
- **Type-Safe**: Full TypeScript support with autocomplete
- **Locale-Aware Formatting**: Currency, dates, and times formatted based on selected language
- **Zero Dependencies**: Built using native browser APIs and existing dependencies

## Usage

### Basic Translation

```tsx
import { useTranslation } from '@/hooks/useTranslation';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('sidebar.tables')}</h1>
      <button>{t('common.save')}</button>
    </div>
  );
}
```

### Translation with Replacements

```tsx
const { t } = useTranslation();

// Translation key: "Minimum length is {min} characters"
const message = t('validation.minLength', { min: 5 });
// Result: "Minimum length is 5 characters"
```

### Currency Formatting

```tsx
import { useFormatCurrency } from '@/hooks/useTranslation';

function PriceDisplay({ amount }: { amount: number }) {
  const formatCurrency = useFormatCurrency();
  
  return <span>{formatCurrency(amount, 'EUR')}</span>;
  // English: "€10.50"
  // Italian: "10,50 €"
}
```

### Date and Time Formatting

```tsx
import { useFormatDate, useFormatTime } from '@/hooks/useTranslation';

function DateDisplay({ date }: { date: Date }) {
  const formatDate = useFormatDate();
  const formatTime = useFormatTime();
  
  return (
    <div>
      <p>{formatDate(date, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p>{formatTime(date)}</p>
    </div>
  );
}
```

## Adding New Languages

### 1. Create Translation File

Create a new file in `src/i18n/locales/` (e.g., `fr.ts` for French):

```typescript
export const fr = {
  common: {
    save: 'Enregistrer',
    cancel: 'Annuler',
    // ... other translations
  },
  sidebar: {
    tables: 'Tables',
    // ... other translations
  },
  // ... other sections
};
```

### 2. Update i18n Configuration

In `src/i18n/index.ts`:

```typescript
import { en } from './locales/en';
import { it } from './locales/it';
import { fr } from './locales/fr'; // Add new import

export type Locale = 'en' | 'it' | 'fr'; // Add new locale

export const translations = {
  en,
  it,
  fr, // Add to translations object
};

export const SUPPORTED_LOCALES: Locale[] = ['en', 'it', 'fr']; // Add to array

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  it: 'Italiano',
  fr: 'Français', // Add display name
};
```

### 3. Test the Implementation

The language selector in Settings will automatically include the new language.

## Translation Keys Structure

All translation keys follow a hierarchical dot notation:

```
section.subsection.key
```

Examples:
- `common.save` → Common UI elements
- `sidebar.tables` → Sidebar navigation items
- `settings.business.title` → Settings page sections
- `orders.status.pending` → Order status labels

## Current Translation Coverage

### Desktop Application

- ✅ Sidebar navigation
- ✅ Settings page (Business Info tab)
- ✅ Common UI elements (buttons, labels)
- ⏳ Other pages (Tables, Orders, Menu, etc.) - to be implemented

### PWA Application

The PWA has partial Italian localization. See `packages/pwa/ITALIAN_LOCALIZATION.md` for details.

## Best Practices

1. **Always use translation keys**: Never hardcode user-facing text
2. **Keep keys descriptive**: Use clear, hierarchical key names
3. **Maintain consistency**: Same concept = same translation across the app
4. **Test both languages**: Verify translations work in both English and Italian
5. **Consider text length**: Italian text is typically 20-30% longer than English

## Language Switching

Users can change the language in **Settings → Business Info → Language**. The change takes effect immediately without requiring a page refresh.

## Technical Details

### State Management

The selected language is stored in Zustand store and persisted to localStorage:

```typescript
interface UIState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  // ... other state
}
```

### Translation Hook

The `useTranslation` hook provides access to translations:

```typescript
export function useTranslation() {
  const locale = useUIStore((state) => state.locale);
  const currentTranslations = translations[locale];
  
  const t = (key: string, replacements?: Record<string, string | number>): string => {
    // Navigation through nested object using dot notation
    // Handles replacements for dynamic values
    // Falls back to key if translation not found
  };
  
  return { t, locale };
}
```

### Formatting Utilities

- `useFormatCurrency()`: Formats numbers as currency based on locale
- `useFormatDate()`: Formats dates using Intl.DateTimeFormat
- `useFormatTime()`: Formats time values based on locale

## Future Enhancements

- [ ] Add more languages (French, German, Spanish, etc.)
- [ ] Complete translation coverage for all pages
- [ ] Add pluralization support
- [ ] Implement translation management system
- [ ] Add language detection based on browser settings
- [ ] Create translation extraction tool for developers

## Contributing Translations

To contribute translations:

1. Fork the repository
2. Add or update translation files in `src/i18n/locales/`
3. Test thoroughly in both languages
4. Submit a pull request with clear description

## Resources

- [Intl API Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [Italian Localization Guide](../../../pwa/ITALIAN_LOCALIZATION.md)
- [Date and Time Formatting](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)

---

**Last Updated**: November 26, 2025
**Version**: 1.0.0
