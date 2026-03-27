# Workspace

## Overview

pnpm workspace monorepo using TypeScript. This is **IA Calorias** — an AI-powered calorie counting SaaS built with React + Vite (frontend) and Express (backend).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Tailwind CSS, Shadcn UI, Framer Motion, React Dropzone
- **AI**: OpenAI GPT-4o Vision for food analysis
- **Payments**: Stripe (Checkout + Webhooks)

## Application Features

- **Smart Alerts**: Server-side nutrition alerts (tip/warning/ok) for protein, fiber, carbs, fat, calories, meals — shown in DailyProgress component. Detects late-night protein gaps, early-day calorie overruns, empty meal days, etc.
- **Goal Celebration**: `GoalCelebration` component with CSS confetti animation triggered when `totals.calories >= rawGoals.calories` (100%) OR `totals.meals >= rawGoals.mealsPerDay`. Supports back-to-back dual celebrations via a queue. Fires once per day per goal type (localStorage guard: `ia-calorias-celebration-{type}-{YYYY-MM-DD}`). Auto-closes at 4000ms. Located at `artifacts/ia-calorias/src/components/GoalCelebration.tsx`
- **Calorie Overrun Banner**: Persistent inline banner in home when `totals.calories > rawGoals.calories` (any positive overrun, day period). Disappears automatically when calories drop back below goal. No manual dismiss — stays visible while over goal.
- **Workout History in Analytics**: `AnalyticsPanel` fetches `GET /api/workout/logs` and shows last 8 sessions with date, exercise count, and duration badge.
- **Chart Legend Enhancement**: StackedCaloriesChart in `AnalyticsPanel` now shows dashed reference line entry in legend ("Meta diária")
- **Free Trial**: 3 free analyses per session (stored by sessionId in localStorage + IndexedDB + Cookie — multi-layer anti-bypass)
- **Device Fingerprint**: SHA-256 hash of canvas, WebGL, audio, hardware signals — used as anonymous sessionId fallback if all layers cleared
- **Paywall**: Modal shown on 4th analysis attempt with two plan options; disableClose=true when limit reached for anonymous users
- **Plans**:
  - Limitado: R$29,90/mês — 20 analyses/month
  - Ilimitado: R$49,90/mês — unlimited analyses
- **AI Analysis**: Upload food photo → OpenAI GPT-4o returns dish name, kcal, protein, carbs, fat as JSON
- **Subscription management**: Stripe Checkout sessions + Webhooks update DB tier
- **Dark/Light mode**: System preference + toggle
- **Onboarding**: Splash screen (2s) → 3-slide carousel → home (first visit only, flag: `ia-calorias-onboarded`)
- **Bottom Navigation**: 5-tab bottom nav (Home, Histórico, Analisar, Metas, Perfil); appears on all screens
- **Design System**: Plus Jakarta Sans font + DM Mono for numbers; green palette #0D9F6E; shimmer/stagger/count-up animations
- **Authentication**: Email/password auth (register, login, logout, forgot/reset password) with JWT
  - JWT stored in `localStorage` key `ia-calorias-auth-token`
  - Auth state shared via React Context (`AuthProvider` in `App.tsx`)
  - Anonymous session data migrated to user account on login/register
  - Password reset via email link (Resend API or console log in dev)
- **LGPD Consent**: Full-screen popup on first visit, stored in `localStorage` key `lgpd-accepted`

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server (routes: user, analysis, subscription)
│   └── ia-calorias/        # React + Vite frontend (main app at /)
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
│       └── src/schema/
│           ├── analyses.ts      # food analyses table
│           └── subscriptions.ts # user subscription/tier table
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## Required Secrets

- `OPENAI_API_KEY` — OpenAI API key for GPT-4o Vision
- `STRIPE_SECRET_KEY` — Stripe secret key
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
- `STRIPE_LIMITED_PRICE_ID` — Stripe Price ID for R$29,90/mês plan
- `STRIPE_UNLIMITED_PRICE_ID` — Stripe Price ID for R$49,90/mês plan
- `DATABASE_URL` — PostgreSQL connection string (auto-provisioned by Replit)
- `JWT_SECRET` — Secret for signing JWTs (falls back to hardcoded dev string if absent)
- `RESEND_API_KEY` — (optional) Resend API key for password reset emails; logs link to console if absent
- `APP_URL` — (optional) Base URL for password reset links (default: `https://iaicalorias.replit.app`)

## API Endpoints

All under `/api`:

- `GET /healthz` — health check
- `GET /user/me` — get current user tier/status (x-session-id header or query param)
- `POST /analysis` — analyze food image (multipart: image + sessionId)
- `GET /analysis/history?sessionId=xxx` — get session history
- `GET /subscription/status?sessionId=xxx` — subscription info
- `POST /subscription/checkout` — create Stripe checkout session
- `POST /subscription/webhook` — Stripe webhook handler
- `POST /auth/register` — create account (email, password, sessionId → token + user)
- `POST /auth/login` — sign in (email, password, sessionId → token + user)
- `POST /auth/logout` — sign out
- `GET /auth/me` — get current user (Bearer token required)
- `POST /auth/forgot-password` — send reset email
- `POST /auth/reset-password` — apply new password (token + password)

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

- **Always typecheck from the root** — run `pnpm run typecheck`
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly`
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client + Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes
