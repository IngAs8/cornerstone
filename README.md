# Cornerstone Capital

> Personal & family finance platform — budget, debt strategies, investments, AI advisor, WhatsApp bot.

A multi-platform SaaS (web + iOS + Android) helping individuals and families take control of their finances. Build budgets, track expenses, eliminate debt with avalanche/snowball strategies, manage crypto and stock portfolios, and get real financial advice from an AI advisor that knows your full financial context.

## Status

🚧 **In active development** — Phase 1 (foundations) in progress.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web | Next.js 15 (App Router) + TypeScript strict |
| Mobile | Expo SDK 52 (React Native) |
| Monorepo | Turborepo + pnpm workspaces |
| Database | Supabase (PostgreSQL) with Row Level Security |
| ORM | Drizzle |
| Auth | Supabase Auth |
| Payments | Stripe Subscriptions |
| WhatsApp Bot | Meta WhatsApp Cloud API + Claude Haiku |
| AI Advisor | Claude Sonnet 4.6 with prompt caching |
| Charts | Recharts (web) / Victory Native (mobile) |
| i18n | next-intl (11 languages) |
| Hosting | Vercel + Expo EAS |

## Project Structure

```
cornerstone/
├── apps/
│   ├── web/              ← Next.js 15 web app (coming next)
│   └── mobile/           ← Expo mobile app (later phase)
├── packages/
│   ├── core/             ← Pure financial logic (zero deps)
│   │   ├── amortization      Variable & fixed-rate amortization
│   │   ├── debt-strategies   Avalanche & snowball
│   │   ├── budget-analyzer   50/30/20, 70/20/10, custom
│   │   ├── currency          Multi-currency conversion
│   │   ├── portfolio         Asset metrics, P&L
│   │   └── financial-context Builds AI advisor context
│   ├── db/               ← Drizzle schema + Supabase client
│   ├── types/            ← Shared TypeScript types
│   └── config/           ← Shared TypeScript & ESLint configs
├── turbo.json            ← Turborepo pipeline
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Quick Start

```bash
# Install
pnpm install

# Run all packages in dev (web + watch mode)
pnpm dev

# Run tests on financial logic
pnpm test

# Type-check everything
pnpm typecheck
```

## Environment Setup

Copy `.env.example` to `.env.local` and fill in the values. See the file for documentation on each variable.

External services required:
- [Supabase](https://supabase.com) — database + auth
- [Vercel](https://vercel.com) — hosting
- [Stripe](https://stripe.com) — payments
- [Anthropic](https://console.anthropic.com) — Claude API
- [Meta WhatsApp Business](https://developers.facebook.com/products/whatsapp) — WhatsApp bot
- [Open Exchange Rates](https://openexchangerates.org) — currency rates
- [Financial Modeling Prep](https://financialmodelingprep.com) — stock prices
- [CoinGecko](https://www.coingecko.com/en/api) — crypto prices
- [Resend](https://resend.com) — transactional email

## Build Order

See `output/financeapp-blueprint.md` and `output/financeapp-execution-plan.md` (in the architect repo) for the full 18-step build plan.

**Current progress:**
- [x] Step 1: Monorepo scaffolding
- [x] `packages/core` foundational financial logic
- [x] `packages/db` Drizzle schema (all 17 tables)
- [ ] Step 2: Supabase project + DB push + RLS policies
- [ ] Step 3: `apps/web` Next.js scaffold + Supabase Auth
- [ ] Step 4: App layouts + design system

## License

Proprietary — All rights reserved.
