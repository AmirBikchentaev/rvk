'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { dictionaries, type Dictionary } from '@/lib/i18n/dictionaries';
import {
  LOCALE_STORAGE_KEY,
  isLocale,
  localeToIntl,
  type Locale,
} from '@/lib/i18n/locale';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
  intlLocale: string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function localeFromPath(pathname: string): Locale | null {
  if (pathname === '/en' || pathname.startsWith('/en/')) return 'en';
  return null;
}

function resolveLocale(pathname: string, initialLocale: Locale): Locale {
  return localeFromPath(pathname) ?? initialLocale;
}

export function LocaleProvider({
  children,
  initialLocale = 'ru',
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const pathname = usePathname();
  const [locale, setLocaleState] = useState<Locale>(() =>
    resolveLocale(pathname, initialLocale),
  );

  useEffect(() => {
    const fromPath = localeFromPath(pathname);
    if (fromPath) {
      setLocaleState(fromPath);
      document.documentElement.lang = fromPath;
      return;
    }
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      const resolved = isLocale(stored) ? stored : initialLocale;
      setLocaleState(resolved);
      document.documentElement.lang = resolved;
    } catch {
      setLocaleState(initialLocale);
      document.documentElement.lang = initialLocale;
    }
  }, [pathname, initialLocale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = next;
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: dictionaries[locale],
      intlLocale: localeToIntl(locale),
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
