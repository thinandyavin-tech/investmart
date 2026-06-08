import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const CSP = [
  "default-src 'self'",
  // Next.js requires unsafe-inline for hydration scripts; tighten with nonces in a future pass
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.tradingview.com s3.tradingview.com",
  "style-src 'self' 'unsafe-inline' *.tradingview.com",
  "img-src 'self' data: https: *.tradingview.com",
  "font-src 'self' https://fonts.gstatic.com *.tradingview.com",
  // Sentry error reporting + Vercel Analytics + TradingView widgets
  "connect-src 'self' *.ingest.sentry.io *.ingest.us.sentry.io vitals.vercel-insights.com *.tradingview.com",
  "frame-src 'self' *.tradingview.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy",        value: CSP },
  { key: "Strict-Transport-Security",       value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options",          value: "nosniff" },
  { key: "X-Frame-Options",                 value: "DENY" },
  { key: "Referrer-Policy",                 value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",              value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["192.168.1.9"],
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org:       process.env.SENTRY_ORG,
  project:   process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Suppress build output unless in CI
  silent: !process.env.CI,

  // Upload source maps from a wider set of files for better stack traces
  widenClientFileUpload: true,

  // Delete source map files from the build output after uploading to Sentry
  sourcemaps: {
    filesToDeleteAfterUpload: [".next/**/*.map"],
  },

  // Tree-shake Sentry debug logger out of the production bundle
  disableLogger: true,
});
