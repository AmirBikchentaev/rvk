'use client';

import { AccrualCashCompare, FormulaGrid } from '@/components/formula-cards';
import { getMethodologyDoc } from '@/lib/methodology-content';
import type { Locale } from '@/lib/i18n/locale';
import { useLocale } from '@/components/locale-provider';

export function FinanceMethodology({ locale }: { locale: Locale }) {
  const { t } = useLocale();
  const doc = getMethodologyDoc(locale);

  return (
    <article className="max-w-4xl space-y-6">
      <header>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{doc.pageTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{doc.pageLead}</p>
      </header>

      <section className="vf-panel border-l-4 border-l-[var(--accent)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{doc.accrualVsCashTitle}</h3>
        <AccrualCashCompare t={t} />
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--text-secondary)]">
          {doc.accrualVsCashBody.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </section>

      {doc.blocks.map((block) => (
        <section key={block.title} className="vf-panel p-5">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{block.title}</h3>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-[var(--text-secondary)]">
            {block.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {block.formulas?.length ? <FormulaGrid items={block.formulas} t={t} /> : null}
          {block.bullets?.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
              {block.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}

      <div className="vf-formula-callout max-w-4xl p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
          {t.formulaChartsTitle}
        </p>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{t.periodChartsLogic}</p>
      </div>

      <section className="vf-panel-muted p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{doc.estimateTitle}</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
          {doc.estimateBullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>

      <section className="vf-panel-muted p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{doc.missingForExactTitle}</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
          {doc.missingForExactBullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>
    </article>
  );
}

/** Compact teaser on KPI tab */
export function MethodologyTeaser({
  locale,
  onOpen,
  labels,
}: {
  locale: Locale;
  onOpen: () => void;
  labels: { title: string; body: string; link: string };
}) {
  void locale;
  return (
    <div className="vf-panel-muted mb-4 border border-[var(--border)] p-4 text-sm">
      <p className="font-medium text-[var(--text-primary)]">{labels.title}</p>
      <p className="mt-1 leading-relaxed text-[var(--text-secondary)]">{labels.body}</p>
      <button type="button" className="vf-link mt-2 font-medium" onClick={onOpen}>
        {labels.link}
      </button>
    </div>
  );
}
