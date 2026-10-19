import Script from 'next/script';

/** Injects API base URL at runtime (Docker env `API_PUBLIC_URL`) — no web rebuild when IP/port changes. */
export function ApiRuntimeConfig() {
  const raw =
    process.env.API_PUBLIC_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim() || '';
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    return null;
  }
  const base = raw.replace(/\/$/, '');
  return (
    <Script id="villa-api-base" strategy="beforeInteractive">
      {`window.__VILLA_API_BASE__=${JSON.stringify(base)};`}
    </Script>
  );
}
