import { env } from './env';
import { supabase } from './supabase';

/** Same analytics endpoint the web uses; the server hashes IP+UA, nothing is stored on device. */
export async function trackEvent(slug: string, event: 'view' | 'qr_open' | 'link_click' | 'contact_save') {
  try {
    const { data } = await supabase.auth.getSession();
    await fetch(`${env.supabaseUrl}/functions/v1/track-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {}) },
      body: JSON.stringify({ slug, event }),
    });
  } catch {
    /* analytics must never break the app */
  }
}
