// Error reporting (Sentry), off unless EXPO_PUBLIC_SENTRY_DSN is set. Privacy (D-76): JavaScript
// errors only, all through sanitizeEvent(). Native crash reports and sessions are off because they
// go out from the native SDK without passing beforeSend (and sessions carry an install id); Play
// Console and Xcode Organizer already show native crashes. No IP inference, screenshots, view
// hierarchy, breadcrumbs, request capture, tracing, replay or logs.
import * as Sentry from '@sentry/react-native';
import { sanitizeEvent } from '@digitalcard/shared/scrub';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

export function initMonitoring(): void {
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? (__DEV__ ? 'development' : 'production'),
    sendDefaultPii: false,
    enableNativeCrashHandling: false,
    enableAutoSessionTracking: false,
    enableAppHangTracking: false,
    enableWatchdogTerminationTracking: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    enableCaptureFailedRequests: false,
    enableUserInteractionTracing: false,
    enableAutoPerformanceTracing: false,
    enableNativeFramesTracking: false,
    tracesSampleRate: 0,
    profilesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    enableLogs: false,
    enableNativeNagger: false,
    maxBreadcrumbs: 0,
    beforeBreadcrumb: () => null,
    beforeSend: (event) => sanitizeEvent(event),
  });
}
