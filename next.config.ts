import type { NextConfig } from "next";
import { withSentryConfig }   from "@sentry/nextjs";
import createNextIntlPlugin   from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const CSP = [
  "default-src 'self'",
  // TradingView widgets require unsafe-inline and unsafe-eval; scope to known origins only
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' *.tradingview.com s3.tradingview.com",
  "style-src 'self' 'unsafe-inline' *.tradingview.com",
  // images: self + data URIs + external HTTPS (stock logos, news images) + TradingView
  "img-src 'self' data: https: blob: *.tradingview.com",
  "font-src 'self' https://fonts.gstatic.com *.tradingview.com",
  // connect: Finnhub WS, Sentry, Vercel analytics, TradingView
  "connect-src 'self' wss://*.finnhub.io *.ingest.sentry.io *.ingest.us.sentry.io vitals.vercel-insights.com *.tradingview.com",
  "frame-src 'self' *.tradingview.com",
  "frame-ancestors 'none'",   // prevents clickjacking via iframe
  "object-src 'none'",        // blocks plugins (Flash, Java, etc.)
  "base-uri 'self'",          // prevents base-tag injection
  "form-action 'self'",       // forms may only POST to same origin
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy",         value: CSP },
  // HSTS: 2-year max-age, include subdomains
  { key: "Strict-Transport-Security",        value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options",           value: "nosniff" },
  { key: "X-Frame-Options",                  value: "DENY" },
  { key: "Referrer-Policy",                  value: "strict-origin-when-cross-origin" },
  // Disable unused browser features to reduce attack surface
  { key: "Permissions-Policy",               value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=(), browsing-topics=()" },
  // Prevent cross-origin window access (blocks tab-napping)
  { key: "Cross-Origin-Opener-Policy",       value: "same-origin-allow-popups" },
  // Block DNS prefetch to avoid leaking visited URLs
  { key: "X-DNS-Prefetch-Control",           value: "off" },
];

const nextConfig: NextConfig = {
  poweredByHeader:     false,
  allowedDevOrigins:   ["192.168.1.9"],
  devIndicators:       false,
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org:       process.env.SENTRY_ORG,
  project:   process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent:    !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { filesToDeleteAfterUpload: [".next/**/*.map"] },
  disableLogger: true,
});
