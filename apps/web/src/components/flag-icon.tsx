import type { Locale } from '@/lib/i18n/locale';

export function FlagIcon({
  locale,
  className = 'h-5 w-7 shrink-0 rounded-[2px] border border-black/10',
}: {
  locale: Locale;
  className?: string;
}) {
  if (locale === 'ru') {
    return (
      <svg viewBox="0 0 21 15" className={className} aria-hidden="true">
        <rect width="21" height="5" fill="#FFFFFF" />
        <rect y="5" width="21" height="5" fill="#0039A6" />
        <rect y="10" width="21" height="5" fill="#D52B1E" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 21 15" className={className} aria-hidden="true">
      <rect width="21" height="15" fill="#B22234" />
      <rect y="1.15" width="21" height="1.15" fill="#FFFFFF" />
      <rect y="3.45" width="21" height="1.15" fill="#FFFFFF" />
      <rect y="5.75" width="21" height="1.15" fill="#FFFFFF" />
      <rect y="8.05" width="21" height="1.15" fill="#FFFFFF" />
      <rect y="10.35" width="21" height="1.15" fill="#FFFFFF" />
      <rect y="12.65" width="21" height="1.15" fill="#FFFFFF" />
      <rect width="9" height="8.05" fill="#3C3B6E" />
    </svg>
  );
}
