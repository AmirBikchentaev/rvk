declare global {
  interface Window {
    /** Set at runtime from layout (Docker `API_PUBLIC_URL`). */
    __VILLA_API_BASE__?: string;
  }
}

function normalizeBase(url: string): string {
  return url.trim().replace(/\/$/, '');
}

/** Server: env at request time. Client: runtime script, then build-time NEXT_PUBLIC, then same-origin /api. */
export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const runtime = window.__VILLA_API_BASE__;
    if (runtime?.startsWith('http://') || runtime?.startsWith('https://')) {
      return normalizeBase(runtime);
    }
    const built = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (built?.startsWith('http://') || built?.startsWith('https://')) {
      return normalizeBase(built);
    }
    return `${window.location.origin}/api`;
  }

  const server =
    process.env.API_PUBLIC_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    'http://127.0.0.1:4000/api';
  if (server.startsWith('http://') || server.startsWith('https://')) {
    return normalizeBase(server);
  }
  return normalizeBase(`http://127.0.0.1:4000/api`);
}
