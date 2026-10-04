export const env = {
  supabaseUrl: (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, ''),
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  webUrl: (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://digitalcard.mn').replace(/\/$/, ''),
  domain: process.env.EXPO_PUBLIC_DOMAIN ?? 'digitalcard.mn',
};

export const publicCardUrl = (slug: string, src?: 'qr') => `${env.webUrl}/c/${slug}${src ? `?src=${src}` : ''}`;
export const storageUrl = (bucket: 'avatars' | 'logos', path: string | null | undefined) =>
  path ? `${env.supabaseUrl}/storage/v1/object/public/${bucket}/${path}` : null;

/** Recognises our card links: https://<domain>/c/<slug>, the configured web URL, or digitalcard://c/<slug>. */
export function parseCardLink(raw: string): string | null {
  try {
    const text = raw.trim();
    if (text.startsWith('digitalcard://')) {
      const m = text.match(/^digitalcard:\/\/c\/([a-z0-9-]{6,40})/i);
      return m ? m[1]!.toLowerCase() : null;
    }
    const url = new URL(text);
    const hosts = new Set([env.domain, `www.${env.domain}`, new URL(env.webUrl).host]);
    if (!hosts.has(url.host)) return null;
    const m = url.pathname.match(/^\/c\/([a-z0-9-]{6,40})\/?$/i);
    return m ? m[1]!.toLowerCase() : null;
  } catch {
    return null;
  }
}
