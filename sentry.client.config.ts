import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of traces in production; full coverage in dev/staging
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Suppress verbose Sentry logs in the browser console
  debug: false,

  beforeSend(event) {
    // Strip request body and cookies — may contain passwords or tokens
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      event.request.headers = {};
    }
    // Retain only the anonymous user ID, drop name/email/ip
    if (event.user) {
      event.user = { id: event.user.id };
    }
    return event;
  },
});
