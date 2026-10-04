// Local stack config: env vars (CI) or `supabase status` (local).
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function fromStatus(): Record<string, string> {
  try {
    const cwd = fileURLToPath(new URL('../../backend', import.meta.url));
    return JSON.parse(execSync('supabase status -o json', { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch {
    return {};
  }
}

const s = process.env.SUPABASE_URL ? {} : fromStatus();
export const API_URL = process.env.SUPABASE_URL ?? s.API_URL ?? 'http://127.0.0.1:54321';
export const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? s.ANON_KEY ?? '';
export const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? s.SERVICE_ROLE_KEY ?? '';
export const FUNCTIONS_URL = `${API_URL}/functions/v1`;
export const MOCK_URL = process.env.MOCK_URL ?? 'http://127.0.0.1:54399';
export const CRON_SECRET = process.env.CRON_SECRET ?? 'local-cron-secret';
export const TURNSTILE_OK = 'XXXX.DUMMY.TOKEN.XXXX';
