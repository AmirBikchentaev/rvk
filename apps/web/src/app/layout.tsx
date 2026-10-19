import type { Metadata } from 'next';
import Script from 'next/script';
import { Geist, Geist_Mono } from 'next/font/google';
import { ApiRuntimeConfig } from '@/components/api-runtime-config';
import { DEFAULT_THEME } from '@/lib/theme';
import './globals.css';

const themeInitScript = `
(function () {
  try {
    var t = localStorage.getItem('villa_finance_theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    } else {
      document.documentElement.setAttribute('data-theme', '${DEFAULT_THEME}');
    }
  } catch (e) {
    document.documentElement.setAttribute('data-theme', '${DEFAULT_THEME}');
  }
})();
`;
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Villa Finance Dashboard',
  description: 'Recruitment exercise prototype',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning data-theme={DEFAULT_THEME}>
      <head>
        <ApiRuntimeConfig />
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
