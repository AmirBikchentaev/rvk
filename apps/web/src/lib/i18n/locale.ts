export const LOCALES = ['ru', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_STORAGE_KEY = 'villa-finance-locale';

export function isLocale(value: string | null | undefined): value is Locale {
  return value === 'ru' || value === 'en';
}

export function localeToIntl(locale: Locale): string {
  return locale === 'en' ? 'en-US' : 'ru-RU';
}
