'use client';

import { getDeliverablesDoc } from '@/lib/deliverables-content';
import {
  AUTHOR_GITHUB_REPO,
  AUTHOR_GITHUB_URL,
  AUTHOR_TELEGRAM_HANDLE,
  AUTHOR_TELEGRAM_URL,
} from '@/lib/site-meta';
import type { Locale } from '@/lib/i18n/locale';
import { useLocale } from '@/components/locale-provider';

export function DeliverablesReport({ locale }: { locale: Locale }) {
  const { t } = useLocale();
  const doc = getDeliverablesDoc(locale);

  return (
    <article className="space-y-8">
      <header className="max-w-3xl">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{doc.pageTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">{doc.pageLead}</p>
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          {t.authorRepo}:{' '}
          <a
            href={AUTHOR_GITHUB_URL}
            className="vf-link"
            target="_blank"
            rel="noopener noreferrer"
            title={AUTHOR_GITHUB_URL}
          >
            {AUTHOR_GITHUB_REPO}
          </a>
          {' · '}
          {t.authorContact}:{' '}
          <a href={AUTHOR_TELEGRAM_URL} className="vf-link" target="_blank" rel="noopener noreferrer">
            {AUTHOR_TELEGRAM_HANDLE}
          </a>
        </p>
      </header>

      {doc.sections.map((section) => (
        <section key={section.id} className="vf-panel max-w-4xl p-5">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{section.title}</h3>
          {section.lead ? (
            <p className="mt-1 text-sm font-medium text-[var(--accent)]">{section.lead}</p>
          ) : null}
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
            {section.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          {section.bullets?.length ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--text-secondary)]">
              {section.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {section.table ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--text-primary)]">
                    {section.table.headers.map((h) => (
                      <th key={h} className="px-3 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section.table.rows.map((row) => (
                    <tr key={row.join('-')} className="border-b border-[var(--border)]/70">
                      {row.map((cell, i) => (
                        <td
                          key={`${row[0]}-${i}`}
                          className={`px-3 py-2 ${i === 0 ? 'font-mono text-xs text-[var(--text-primary)]' : ''}`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {section.diagram?.length ? (
            <pre
              className="mt-4 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] px-4 py-3 font-mono text-xs leading-relaxed text-[var(--text-primary)]"
              aria-label="Architecture flow"
            >
              {section.diagram.join('\n')}
            </pre>
          ) : null}
        </section>
      ))}

      <section className="vf-panel-muted max-w-4xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{doc.cfoTitle}</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--text-secondary)]">
          {doc.cfoQuestions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ol>
      </section>
    </article>
  );
}
