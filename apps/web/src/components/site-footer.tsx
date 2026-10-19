'use client';

import {
  AUTHOR_GITHUB_URL,
  AUTHOR_TELEGRAM_HANDLE,
  AUTHOR_TELEGRAM_URL,
} from '@/lib/site-meta';
import { useLocale } from '@/components/locale-provider';

export function SiteFooter() {
  const { t } = useLocale();

  return (
    <footer className="mt-10 border-t border-[var(--border)] pt-6 text-sm text-[var(--text-muted)]">
      <p>
        {t.authorLabel}:{' '}
        <a
          href={AUTHOR_GITHUB_URL}
          className="vf-link font-medium"
          target="_blank"
          rel="noopener noreferrer"
        >
          github.com/AmirBikchentaev/rvk
        </a>
        {' · '}
        {t.authorContact}:{' '}
        <a
          href={AUTHOR_TELEGRAM_URL}
          className="vf-link font-medium"
          target="_blank"
          rel="noopener noreferrer"
        >
          {AUTHOR_TELEGRAM_HANDLE}
        </a>
      </p>
    </footer>
  );
}
