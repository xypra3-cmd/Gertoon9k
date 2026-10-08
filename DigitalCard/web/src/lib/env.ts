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
  /** Supabase Auth bot protection (Turnstile) enabled in the dashboard → send captchaToken on sign-up. */
  authCaptcha: import.meta.env.VITE_AUTH_CAPTCHA === 'true',
  /** Sentry DSN (public by design). Empty = error reporting off. */
  sentryDsn: (import.meta.env.VITE_SENTRY_DSN as string | undefined) ?? '',
  sentryEnvironment: (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined) ?? 'production',
  /** Build id: Netlify's COMMIT_REF (vite.config.ts), "dev" locally. */
  release: __APP_RELEASE__,
};

export const functionsUrl = `${env.supabaseUrl}/functions/v1`;

export function publicCardUrl(slug: string, src?: 'qr' | 'email'): string {
  return `${env.publicBaseUrl}/c/${slug}${src ? `?src=${src}` : ''}`;
}

export function storageUrl(bucket: 'avatars' | 'logos', path: string | null | undefined): string | null {
  if (!path) return null;
  return `${env.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}
