import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
let client: SupabaseClient | undefined;

function getSupabaseClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('Supabase frontend configuration is missing');
  client = createClient(url, key);
  return client;
}

export async function getSession() {
  return getSupabaseClient().auth.getSession();
}

export async function signIn(email: string, password: string) {
  return getSupabaseClient().auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return getSupabaseClient().auth.signOut();
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { data, error } = await getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Your session has expired. Please sign in again.');
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}`, ...init?.headers } });
  if (!response.ok) throw new Error((await response.text()) || `Request failed with status ${response.status}`);
  return response.json() as Promise<T>;
}
