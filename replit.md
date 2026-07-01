# HustleCoin V2

A Telegram Mini App where users earn HP (HustleCoin Points) through daily mining, referrals, and tasks. Built from scratch with clean architecture on an existing Neon PostgreSQL database.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/hustlecoin run dev` — run the frontend (port 21494)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + TailwindCSS + Framer Motion + Wouter routing
- API: Express 5 + express-session (cookie-based sessions)
- DB: PostgreSQL (Neon) + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for API contracts
- `lib/db/src/schema/users.ts` — users table schema
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/lib/telegram.ts` — Telegram initData validation (HMAC-SHA256)
- `artifacts/api-server/src/lib/referral.ts` — referral code generation
- `artifacts/api-server/src/middlewares/session.ts` — express-session config
- `artifacts/api-server/src/middlewares/auth.ts` — requireAuth middleware
- `artifacts/hustlecoin/src/` — React frontend (dark crypto theme)

## Architecture decisions

- Telegram authentication uses HMAC-SHA256 validation of `initData` per Telegram docs. In dev, `initData: "dev_bypass"` creates a test user.
- Sessions are cookie-based (express-session) with httpOnly + sameSite=none in production for Telegram WebView compatibility.
- CORS is configured to allow only `REPLIT_DOMAINS` in production; open in development.
- Frontend detects `window.Telegram?.WebApp` presence; shows "Open in Telegram" placeholder in browser.
- Dark mode forced by default via `document.documentElement.classList.add("dark")` on mount.

## Product

Phase 1 complete: Telegram auth, user creation/login, session management, home screen (HP balance, mining streak, rank, Mine Now button), and profile screen.

## User preferences

- Build in phases; stop after each phase for approval before continuing.
- Do NOT recreate or reset the existing Neon database.
- Do NOT copy code from previous project versions.

## Gotchas

- After changing `lib/db/src/schema/`, run `pnpm run typecheck:libs` before typechecking artifacts — stale declarations cause false "no exported member" errors.
- Telegram WebApp cookie `sameSite` must be `"none"` + `secure: true` in production for cross-origin WebView sessions to work.
- The Orval codegen produces `<OperationIdPascal>Body` Zod names — never name `components/schemas` entries with that pattern or you'll get TS2308 collisions.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
