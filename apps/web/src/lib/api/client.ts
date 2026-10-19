/**
 * Browser: always same-origin `/api` (nginx in Docker, Next rewrites in dev).
 * Override only for unusual setups: NEXT_PUBLIC_API_URL=http://127.0.0.1:4000/api
 */
export function getApiBase(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (typeof window !== 'undefined') {
    if (configured?.startsWith('http://') || configured?.startsWith('https://')) {
      return configured;
    }
    return `${window.location.origin}/api`;
  }
  return configured || 'http://127.0.0.1:4000/api';
}

type Tokens = { accessToken: string; refreshToken: string };

let memoryTokens: Tokens | null = null;

export function setTokens(tokens: Tokens | null) {
  memoryTokens = tokens;
  if (typeof window !== 'undefined') {
    if (tokens) {
      localStorage.setItem('villa_tokens', JSON.stringify(tokens));
    } else {
      localStorage.removeItem('villa_tokens');
    }
  }
}

export function getTokens(): Tokens | null {
  if (memoryTokens) return memoryTokens;
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('villa_tokens');
  if (!raw) return null;
  try {
    memoryTokens = JSON.parse(raw) as Tokens;
    return memoryTokens;
  } catch {
    return null;
  }
}

async function refreshAccessToken(refreshToken: string): Promise<Tokens> {
  const base = getApiBase();
  const res = await fetch(`${base}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error('refresh failed');
  const data = await res.json();
  const tokens = { accessToken: data.accessToken, refreshToken: data.refreshToken };
  setTokens(tokens);
  return tokens;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  const url = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
  const tokens = getTokens();
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch (e) {
    const hint =
      typeof window !== 'undefined'
        ? ` (${window.location.origin}/api — проверьте, что API/nginx запущены)`
        : '';
    throw new Error(`Failed to fetch${hint}: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (res.status === 401 && tokens?.refreshToken) {
    const next = await refreshAccessToken(tokens.refreshToken);
    headers.set('Authorization', `Bearer ${next.accessToken}`);
    res = await fetch(url, { ...init, headers });
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export async function ensureDemoSession() {
  if (process.env.NEXT_PUBLIC_DISABLE_DEMO_AUTO_LOGIN === 'true') return;
  if (getTokens()) return;
  const base = getApiBase();
  try {
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@villa.local', password: 'demo1234' }),
    });
    if (!res.ok) return;
    const data = await res.json();
    setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  } catch {
    // API down — queries will surface the error
  }
}
