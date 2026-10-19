'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { LocaleProvider } from '@/components/locale-provider';
import { ThemeProvider } from '@/components/theme-provider';
import type { Locale } from '@/lib/i18n/locale';

export function Providers({
  children,
  initialLocale = 'ru',
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
