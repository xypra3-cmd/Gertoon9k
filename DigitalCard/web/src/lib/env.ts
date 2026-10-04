// Typed access to Vite env. Only VITE_* values reach the browser — never put secrets here.
export const env = {
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? '',
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '',
  publicBaseUrl: ((import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined) ?? window.location.origin).replace(
    /\/$/,
    '',
  ),
  turnstileSiteKey: (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? '',
  demoMode: import.meta.env.VITE_DEMO_MODE === 'true',
};

export const functionsUrl = `${env.supabaseUrl}/functions/v1`;

export function publicCardUrl(slug: string, src?: 'qr'): string {
  return `${env.publicBaseUrl}/c/${slug}${src ? `?src=${src}` : ''}`;
}

export function storageUrl(bucket: 'avatars' | 'logos', path: string | null | undefined): string | null {
  if (!path) return null;
  return `${env.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
