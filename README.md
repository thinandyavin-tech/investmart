# InvestMart

**AI market-intelligence platform for US and Thai stocks** — live at **[investmart.vercel.app](https://investmart.vercel.app)**

InvestMart brings the S&P 500, NASDAQ 100 and SET50 into one app and uses AI to turn raw market data and headlines into something a regular investor can act on.

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

---

Built by **Yavin Songkham** — [thinandyavin@gmail.com](mailto:thinandyavin@gmail.com)
