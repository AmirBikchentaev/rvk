'use client';

import { useRouter } from 'next/navigation';
import { FlagIcon } from '@/components/flag-icon';
import { useLocale } from '@/components/locale-provider';
import type { Locale } from '@/lib/i18n/locale';

const OPTIONS: { id: Locale; labelKey: 'langRu' | 'langEn' }[] = [
  { id: 'ru', labelKey: 'langRu' },
  { id: 'en', labelKey: 'langEn' },
];

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();
  const router = useRouter();

  return (
    <div
      className={`flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-0.5 shadow-sm ${className}`}
      role="group"
      aria-label={t.language}
    >
      {OPTIONS.map((option) => {
        const selected = locale === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              setLocale(option.id);
              router.push(option.id === 'en' ? '/en' : '/');
            }}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              selected ? 'vf-segment-selected' : 'vf-segment-idle'
            }`}
          >
            <FlagIcon
              locale={option.id}
              className="h-3.5 w-5 shrink-0 rounded-[2px] border border-black/10"
            />
            <span>{t[option.labelKey]}</span>
          </button>
        );
      })}
    </div>
  );
}
