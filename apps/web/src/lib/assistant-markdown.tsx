import type { ReactNode } from 'react';

/** Minimal markdown for chat: **bold**, _italic_, `code`, lists, paragraphs. */
export function AssistantMarkdown({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/);
  return (
    <div className="vf-assistant-md space-y-3 text-sm leading-relaxed">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: string }) {
  const lines = block.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return null;

  const listLines = lines.filter((l) => /^[-*]\s+/.test(l.trim()));
  const isList = listLines.length > 0 && listLines.length === lines.length;
  if (isList) {
    return (
      <ul className="list-disc space-y-1 pl-5 text-[var(--text-secondary)]">
        {listLines.map((l, i) => (
          <li key={i}>{inline(l.replace(/^[-*]\s+/, ''))}</li>
        ))}
      </ul>
    );
  }

  if (listLines.length > 0 && lines.length > listLines.length) {
    const titleLines = lines.filter((l) => !/^[-*]\s+/.test(l.trim()));
    return (
      <div className="space-y-2">
        {titleLines.map((t, i) => (
          <p key={i} className="font-medium text-[var(--text-primary)]">
            {inline(t)}
          </p>
        ))}
        <ul className="list-disc space-y-1 pl-5 text-[var(--text-secondary)]">
          {listLines.map((l, i) => (
            <li key={i}>{inline(l.replace(/^[-*]\s+/, ''))}</li>
          ))}
        </ul>
      </div>
    );
  }

  return <p className="text-[var(--text-primary)]">{inline(lines.join(' '))}</p>;
}

function inline(s: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    const token = m[0];
    if (token.startsWith('**')) {
      parts.push(
        <strong key={k++} className="font-semibold text-[var(--text-primary)]">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith('_')) {
      parts.push(
        <em key={k++} className="text-[var(--text-muted)] not-italic">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith('`')) {
      parts.push(
        <code
          key={k++}
          className="rounded bg-[var(--bg-hover)] px-1 py-0.5 text-xs text-[var(--text-secondary)]"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + token.length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts.length ? parts : [s];
}
