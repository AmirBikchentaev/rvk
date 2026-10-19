'use client';

import type { Dictionary } from '@/lib/i18n/dictionaries';

export type DashboardSection = 'overview' | 'charts' | 'assistant' | 'data';

const SECTIONS: { id: DashboardSection; labelKey: keyof Dictionary }[] = [
  { id: 'overview', labelKey: 'navOverview' },
  { id: 'charts', labelKey: 'navCharts' },
  { id: 'assistant', labelKey: 'navAssistant' },
  { id: 'data', labelKey: 'navData' },
];

export function DashboardNav({
  active,
  onChange,
  t,
  dataIssueCount,
  dataIssueHint,
}: {
  active: DashboardSection;
  onChange: (section: DashboardSection) => void;
  t: Dictionary;
  dataIssueCount?: number;
  dataIssueHint?: string;
}) {
  return (
    <nav
      className="sticky top-0 z-40 -mx-6 border-y border-[var(--border)] bg-[var(--bg-elevated)]/95 px-6 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-[var(--bg-elevated)]/80"
      aria-label={t.navMain}
    >
      <div className="flex gap-1 overflow-x-auto">
        {SECTIONS.map(({ id, labelKey }) => {
          const selected = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selected ? 'vf-nav-active shadow-sm' : 'vf-nav-idle'
              }`}
              aria-current={selected ? 'page' : undefined}
            >
              {t[labelKey]}
              {id === 'data' && dataIssueCount !== undefined ? (
                <span
                  className={`vf-nav-badge ${selected ? 'vf-nav-badge-active' : 'vf-nav-badge-idle'}`}
                  title={dataIssueHint}
                >
                  {dataIssueCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
