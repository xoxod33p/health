import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | undefined;
let cachedSession: Session | null | undefined;

export function getApiBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api/v1')) {
    url = `${url}/api/v1`;
  }
  return url;
}

function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase frontend configuration is missing');
  client = createClient(url, key);
  return client;
}

export async function getSession() {
  if (cachedSession !== undefined) return { data: { session: cachedSession }, error: null };
  const result = await getSupabaseClient().auth.getSession();
  cachedSession = result.data.session;
  return result;
}

export function getCachedSession(): Session | null | undefined {
  return cachedSession;
}

export async function signIn(email: string, password: string) {
  const result = await getSupabaseClient().auth.signInWithPassword({ email, password });
  if (!result.error) cachedSession = result.data.session;
  return result;
}

export async function signOut() {
  const result = await getSupabaseClient().auth.signOut();
  cachedSession = null;
  return result;
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
