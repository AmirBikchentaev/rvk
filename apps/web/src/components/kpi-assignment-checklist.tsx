'use client';

import type { Dictionary } from '@/lib/i18n/dictionaries';

export function KpiAssignmentChecklist({ t }: { t: Dictionary }) {
  const items = [
    t.kpiCheckPropertyFilter,
    t.kpiCheckPeriodFilter,
    t.kpiCheckGross,
    t.kpiCheckOta,
    t.kpiCheckMgmt,
    t.kpiCheckOpex,
    t.kpiCheckOwner,
    t.kpiCheckAccrualCash,
  ];

  return (
    <details className="vf-panel-muted mb-4 open:border-[var(--accent)]">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[var(--text-primary)] [&::-webkit-details-marker]:hidden">
        {t.kpiCheckTitle}
        <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">({t.kpiCheckSubtitle})</span>
      </summary>
      <ul className="space-y-2 border-t border-[var(--border)] px-4 py-3 text-sm text-[var(--text-secondary)]">
        {items.map((line) => (
          <li key={line} className="flex gap-2">
            <span className="text-[var(--accent)]" aria-hidden>
              ✓
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
