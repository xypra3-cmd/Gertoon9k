// Error reporting (Sentry), off unless VITE_SENTRY_DSN is set. The SDK is loaded lazily after the page
// is idle, so it never costs the public card's first paint. Privacy (D-76): no user info, cookies,
// headers, query strings, bodies, breadcrumbs, replay or tracing; sanitizeEvent() scrubs the rest.
import { sanitizeEvent } from '@digitalcard/shared/scrub';
import { env } from './env';

export function initMonitoring(): void {
  if (!env.sentryDsn) return;
  const start = () => {
    void import('@sentry/react').then((Sentry) => {
      Sentry.init({
        dsn: env.sentryDsn,
        environment: env.sentryEnvironment,
        release: env.release,
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: false,
          httpBodies: [],
          urlQueryParams: false,
          stackFrameVariables: false,
        },
        // Errors only: no breadcrumbs (URLs, clicked labels) and no console capture.
        integrations: (defaults) => defaults.filter((i) => !['Breadcrumbs', 'Console'].includes(i.name)),
        tracesSampleRate: 0,
        maxBreadcrumbs: 0,
        beforeBreadcrumb: () => null,
        beforeSend: (event) => sanitizeEvent(event),
      });
    });
  };
  if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 5000 });
  else setTimeout(start, 3000);
}
