'use client';

import { useLocale } from '@/components/locale-provider';
import { useTheme } from '@/components/theme-provider';
import type { Theme } from '@/lib/theme';

function ThemeIcon({ theme, className = 'h-4 w-4' }: { theme: Theme; className?: string }) {
  if (theme === 'light') {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function ThemeSwitcher({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { t } = useLocale();

  const options: Array<{ id: Theme; label: string }> = [
    { id: 'dark', label: t.themeDark },
    { id: 'light', label: t.themeLight },
  ];

  return (
    <div
      className={`flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-0.5 shadow-sm ${className}`}
      role="group"
      aria-label={t.theme}
    >
      {options.map((option) => {
        const selected = theme === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => setTheme(option.id)}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              selected ? 'vf-segment-selected' : 'vf-segment-idle'
            }`}
            suppressHydrationWarning
          >
            <ThemeIcon theme={option.id} className="h-3.5 w-3.5 shrink-0" />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
