# InvestMart

[![CI](https://github.com/thinandyavin-tech/investmart/actions/workflows/ci.yml/badge.svg)](https://github.com/thinandyavin-tech/investmart/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)

> A deployed, bilingual market-intelligence product built around explainable research workflows.

**AI market-intelligence platform for US and Thai stocks** — live at **[investmart.vercel.app](https://investmart.vercel.app)**

InvestMart brings the S&P 500, NASDAQ 100 and SET50 into one app and uses AI to turn raw market data and headlines into something a regular investor can act on.

This is a working product, not a trading signal service. The app presents market data, assumptions, and model output together so a user can inspect why a view was produced.

## Features

- **AI news engine** — summarises market headlines and rates each story's likely impact and momentum.
- **Daily infographic** — auto-generates a shareable, at-a-glance snapshot of the day's top stories.
- **"Martin" AI assistant** — answers stock questions grounded in real-time price and market data.
- **Radar & screeners** — momentum scans, dividend/growth screens, movers and sector views.
- **Stock lab** — valuation (DCF / reverse DCF), SWOT, risk, RSI and "why is it moving" analysis.
- **Paper trading & social** — portfolios, watchlists, alerts (web push), journal, posts and leaderboard.
- **Thai / English** UI.

## Tech stack

Next.js (App Router) · React · TypeScript · Prisma + Neon Postgres · NextAuth (Google + email) · Upstash Redis (rate limiting, caching) · lightweight-charts · Sentry · Vercel

**AI:** a provider chain with automatic fallback (Cerebras → Groq → NVIDIA → Gemini) so the assistant keeps working when one provider is down or out of quota.
**Data:** Finnhub (quotes, news, fundamentals) with server-side caching.

## Request flow

```text
Browser (locale-aware App Router)
  -> validated route handler (Zod + rate limit)
  -> cached provider adapter (Finnhub / AI chain)
  -> Prisma + Neon for user state
  -> Sentry for errors and Vercel for deployment
```

The AI layer is intentionally behind provider adapters. A provider outage produces a bounded fallback or an explicit unavailable response; it does not silently invent market data. Authentication, scheduled jobs, and public endpoints use separate rate-limit policies.

## Security

- All secrets live in environment variables (see `.env.example`); nothing sensitive is committed.
- Per-IP rate limiting on every public and AI endpoint; scheduled jobs require a secret bearer token.
- Strict security headers (CSP, HSTS, `frame-ancestors 'none'`), bcrypt password hashing, signed demo cookies, input validation with Zod.

## Running locally

```bash
cp .env.example .env.local   # fill in your own keys
npm install
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000.

The local app needs service credentials for live quotes and sign-in. Without them, use the deployed demo link above. Never commit `.env.local` or production credentials.

## Verification

```bash
npm run lint
npx tsc --noEmit
npm run build
```

CI runs type-checking and a production build with a placeholder database URL. The build does not exercise live provider credentials or a production migration; deploys still need a migration and secrets review.

---

Built by **Yavin Songkham** — [thinandyavin@gmail.com](mailto:thinandyavin@gmail.com)

MIT © Yavin Songkham
