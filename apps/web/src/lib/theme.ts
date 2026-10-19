export type Theme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'villa_finance_theme';

export const DEFAULT_THEME: Theme = 'light';

export function isTheme(value: string | null): value is Theme {
  return value === 'dark' || value === 'light';
}
