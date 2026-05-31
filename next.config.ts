import type { NextConfig } from "next";

const CSP = [
  "default-src 'self'",
  // Next.js requires unsafe-inline for hydration scripts; tighten with nonces in a future pass
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self'",
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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
