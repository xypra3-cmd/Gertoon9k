import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@digitalcard/shared/types';
import { env } from './env';
import { secureStorage } from './secureStorage';

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { storage: secureStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'dc-auth' },
});

// Refresh tokens only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') void supabase.auth.startAutoRefresh();
  else void supabase.auth.stopAutoRefresh();
});
