import { createClient } from '@supabase/supabase-js';
import type { Database } from '@digitalcard/shared';
import { env } from './env';

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'dc-auth' },
});

/** Throws the PostgREST error so TanStack Query / forms can map it with errorKey(). */
export function unwrap<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}
