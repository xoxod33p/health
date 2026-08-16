export interface AuthUser {
  id: string;
  email: string;
  role: string;
  companyId: string;
  isDefaultAdmin?: boolean;
}

export interface AuthSession {
  access_token: string;
  user: AuthUser;
}

const TOKEN_KEY = 'healthcare_auth_token';
let cachedToken: string | null = null;
let cachedUser: AuthUser | null = null;

export function getApiBaseUrl(): string {
  // If running in browser:
  if (typeof window !== 'undefined') {
    // In browser on a custom domain (e.g. test.xoxod33p.tech), always use same-origin /api/v1
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${window.location.origin}/api/v1`;
    }
    // In local development:
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  }

  // Server-Side Rendering (SSR / Node environment)
  let url = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://127.0.0.1:3001/api/v1';
  if (!url.endsWith('/api/v1')) {
    url = `${url.replace(/\/+$/, '')}/api/v1`;
  }
  return url;
}

export function getStoredToken(): string | null {
  if (cachedToken) return cachedToken;
  if (typeof window !== 'undefined') {
    cachedToken = localStorage.getItem(TOKEN_KEY);
    return cachedToken;
  }
  return null;
}

export async function getSession(): Promise<{ data: { session: AuthSession | null }; error: Error | null }> {
  const token = getStoredToken();
  if (!token) {
    cachedUser = null;
    return { data: { session: null }, error: null };
  }

  if (cachedUser) {
    return { data: { session: { access_token: token, user: cachedUser } }, error: null };
  }

  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      localStorage.removeItem(TOKEN_KEY);
      cachedToken = null;
      cachedUser = null;
      return { data: { session: null }, error: null };
    }

    const user = (await response.json()) as AuthUser;
    cachedUser = user;
    return { data: { session: { access_token: token, user } }, error: null };
  } catch (error) {
    return { data: { session: null }, error: error instanceof Error ? error : new Error('Session fetch failed') };
  }
}

export function getCachedSession(): AuthSession | null {
  const token = getStoredToken();
  if (!token || !cachedUser) return null;
  return { access_token: token, user: cachedUser };
}

export async function signIn(email: string, password: string): Promise<{ data: { session: AuthSession | null }; error: Error | null }> {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const body = await response.json();
    if (!response.ok) {
      return { data: { session: null }, error: new Error(body.message || 'Invalid email or password') };
    }

    const session = body as AuthSession;
    cachedToken = session.access_token;
    cachedUser = session.user;

    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, session.access_token);
    }

    return { data: { session }, error: null };
  } catch (error) {
    return { data: { session: null }, error: error instanceof Error ? error : new Error('Login failed') };
  }
}

export async function signOut(): Promise<{ error: Error | null }> {
  cachedToken = null;
  cachedUser = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
  }
  return { error: null };
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { data, error } = await getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Your session has expired. Please sign in again.');

  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = `${baseUrl}${cleanPath}`;

  const response = await fetch(targetUrl, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const rawText = await response.text();
    if (rawText.trim().startsWith('<') || rawText.includes('<!DOCTYPE')) {
      throw new Error(`API Error (${response.status} ${response.statusText}): Backend endpoint unreachable at ${targetUrl}`);
    }
    throw new Error(rawText || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function apiDownload(path: string, defaultFilename: string): Promise<void> {
  const { data, error } = await getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Your session has expired. Please sign in again.');

  const baseUrl = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const targetUrl = `${baseUrl}${cleanPath}`;

  const response = await fetch(targetUrl, {
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Download failed with status ${response.status}`);
  }

  const disposition = response.headers.get('Content-Disposition');
  let filename = defaultFilename;
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) filename = match[1];
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
