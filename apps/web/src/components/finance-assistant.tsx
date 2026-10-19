'use client';

import { useMemo, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import { apiFetch } from '@/lib/api/client';
import { AssistantMarkdown } from '@/lib/assistant-markdown';
import { filterFieldClass } from '@/lib/form-styles';
import type { Locale } from '@/lib/i18n/locale';

type ChatResponse = {
  mode: 'openai' | 'offline';
  reply: string;
  toolCalls?: { name: string; args: unknown }[];
};

type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
  mode?: ChatResponse['mode'];
  tools?: string[];
};

export function FinanceAssistant({
  propertyId,
  locale,
  from,
  to,
}: {
  propertyId: string;
  locale: Locale;
  from?: string;
  to?: string;
}) {
  const { t } = useLocale();
  const suggestions = useMemo(
    () => [t.suggest1, t.suggest2, t.suggest3, t.suggest4],
    [t],
  );

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const offlineActive = history.some((m) => m.role === 'assistant' && m.mode === 'offline');

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setMessage('');
    setHistory((h) => [...h, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const res = await apiFetch<ChatResponse>('/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: q,
          propertyId: propertyId || undefined,
          from: from || undefined,
          to: to || undefined,
          locale,
        }),
      });
      setHistory((h) => [
        ...h,
        {
          role: 'assistant',
          text: res.reply,
          mode: res.mode,
          tools: res.mode === 'openai' ? res.toolCalls?.map((x) => x.name) : undefined,
        },
      ]);
    } catch (e) {
      setHistory((h) => [
        ...h,
        { role: 'assistant', text: e instanceof Error ? e.message : t.error },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="vf-assistant">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">{t.assistantTitle}</h2>

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            className="vf-assistant-chip rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
            onClick={() => void send(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="vf-assistant-log mt-4 max-h-[28rem] space-y-4 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3">
        {offlineActive && (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs leading-relaxed text-[var(--text-secondary)]">
            {t.assistantOfflineNotice}
          </p>
        )}

        {history.length === 0 && !loading && (
          <p className="text-sm text-[var(--text-muted)]">{t.assistantEmpty}</p>
        )}

        {history.map((m, i) => (
          <div
            key={i}
            className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <span className="px-1 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              {m.role === 'user' ? t.assistantYou : t.assistantBot}
            </span>
            <div
              className={
                m.role === 'user'
                  ? 'vf-assistant-user-bubble max-w-[92%] rounded-2xl rounded-br-md bg-[var(--bg-hover)] px-3 py-2 sm:max-w-[85%]'
                  : 'vf-assistant-bot-bubble w-full max-w-full rounded-2xl rounded-bl-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-3 sm:max-w-[95%]'
              }
            >
              {m.role === 'user' ? (
                <p className="text-sm text-[var(--text-primary)]">{m.text}</p>
              ) : (
                <AssistantMarkdown text={m.text} />
              )}
              {m.tools?.length ? (
                <details className="mt-3 border-t border-[var(--border)] pt-2">
                  <summary className="cursor-pointer text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                    {t.assistantTools} ({m.tools.length})
                  </summary>
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-[var(--text-muted)]">
                    {m.tools.join(' · ')}
                  </p>
                </details>
              ) : null}
            </div>
          </div>
        ))}

        {loading && (
          <p className="text-sm text-[var(--text-muted)]">{t.assistantThinking}</p>
        )}
      </div>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(message);
        }}
      >
        <input
          className={`${filterFieldClass} mt-0 flex-1 py-2 text-sm`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t.assistantPlaceholder}
        />
        <button type="submit" disabled={loading} className="vf-btn-accent disabled:opacity-50">
          {t.assistantSend}
        </button>
      </form>
    </section>
  );
}
