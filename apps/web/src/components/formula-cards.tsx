'use client';

import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { FormulaDef, FormulaKind } from '@/lib/methodology-content';

export type FormulaItem = FormulaDef;
export type { FormulaKind };

function kindLabel(kind: FormulaKind | undefined, t: Dictionary): string | null {
  switch (kind) {
    case 'accrual':
      return t.formulaKindAccrual;
    case 'cash':
      return t.formulaKindCash;
    case 'bridge':
      return t.formulaKindBridge;
    case 'period':
      return t.formulaKindPeriod;
    default:
      return null;
  }
}

function FormulaExpression({ expression }: { expression: string }) {
  const lines = expression.split('\n');
  return (
    <div className="vf-formula-expr" aria-label={expression}>
      {lines.map((line, i) => (
        <div key={i} className={i > 0 ? 'mt-1 border-t border-[var(--border)]/60 pt-1' : ''}>
          {line}
        </div>
      ))}
    </div>
  );
}

export function FormulaCard({ item, t }: { item: FormulaItem; t: Dictionary }) {
  const badge = kindLabel(item.kind, t);
  return (
    <div className={`vf-formula-card ${item.kind ? `vf-formula-card--${item.kind}` : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h4 className="text-sm font-semibold text-[var(--text-primary)]">{item.label}</h4>
        {badge ? <span className="vf-formula-badge">{badge}</span> : null}
      </div>
      <FormulaExpression expression={item.expression} />
      <p className="mt-2 text-xs leading-relaxed text-[var(--text-muted)]">{item.note}</p>
    </div>
  );
}

export function FormulaGrid({ items, t }: { items: FormulaItem[]; t: Dictionary }) {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <FormulaCard key={item.label} item={item} t={t} />
      ))}
    </div>
  );
}

export function AccrualCashCompare({ t }: { t: Dictionary }) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <div className="vf-formula-compare vf-formula-compare--accrual">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
          {t.formulaCompareAccrualTitle}
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{t.formulaCompareAccrualBody}</p>
        <p className="vf-formula-expr mt-3 text-center text-sm">check-in / check-out</p>
      </div>
      <div className="vf-formula-compare vf-formula-compare--cash">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
          {t.formulaCompareCashTitle}
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{t.formulaCompareCashBody}</p>
        <p className="vf-formula-expr mt-3 text-center text-sm">payment_date</p>
      </div>
    </div>
  );
}
