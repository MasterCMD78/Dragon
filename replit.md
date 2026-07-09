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

Phase 2 complete: Mining module — 24h mining sessions, streak bonuses (base 100 HP, +10 at streak 2-6, +50 at streak 7+), 4 API endpoints (GET /api/mining/status, POST /api/mining/start, POST /api/mining/claim, GET /api/mining/history), full mining UI with three states (idle/mining/claimable), live countdown timer, reward splash animation, and mining history list.

Phase 3 complete: Referral Engine — referral code generation/lookup, referral tracking, and reward payouts, with a full frontend screen showing referral link/code, share action, and list of referred users.

Phase 5 complete: Leaderboards — 4 API endpoints (GET /api/leaderboard/global, /mining, /referrals, /me), and a full frontend Leaderboards screen with Global/Mining/Referrals tabs, medal styling for top 3, skeleton loading states, pull-to-refresh, and a pinned "Your Rank" footer when the current user is outside the visible top list.

Phase 6 complete: Tasks System — 5 backend endpoints (GET /tasks, GET /tasks/:id, POST /tasks/:id/start, POST /tasks/:id/complete, POST /tasks/:id/claim), atomic reward transactions with row-level locking to prevent double-claims, task categorisation (daily vs one-time) via server-side registry, server-side condition verifiers for Daily Login / Mine Today / Visit Leaderboard / Visit Referral Page / Invite Friends, idempotent seed of the 5 canonical daily tasks on server startup, legacy-safe claim logic (only tasks completed after server launch eligible for reward), full /tasks frontend page with Daily/One-Time tabs, progress bar, skeleton loading, pull-to-refresh, empty states, and a Tasks icon added to the bottom nav.

Phase 7 complete: Quests System — 5 backend endpoints (GET /quests, GET /quests/:id, POST /quests/:id/start, POST /quests/:id/progress, POST /quests/:id/claim), atomic reward claims with SELECT FOR UPDATE row-locking on user + duplicate-claim guard via transactions table (type="quest", relatedId=progressId), no "claimed" column needed — source-of-truth is the transactions ledger. Quest type registry with 6 auto-computed progress verifiers (mine, complete_task, invite_friend, login_streak, earn_hp, weekly_challenge). Period-key isolation: daily quests key by YYYY-MM-DD, weekly quests by ISO week string — natural daily/weekly reset with no cleanup job needed. Idempotent seed of 3 new quest types on server startup. Full /quests frontend page with Daily/Weekly tabs, per-quest progress bars, Claim button with glow animation, Completed badge, skeleton loading, pull-to-refresh, and a Quests (Swords) icon added to the bottom nav.

## User preferences

- Build in phases; stop after each phase for approval before continuing.
- Do NOT recreate or reset the existing Neon database.
- Do NOT copy code from previous project versions.

## Production database rules (enforced every phase)

- **Never run `db push` or `db migrate`** against the production database.
- **Never recreate production tables.** All 16 tables belong to the existing Neon DB.
- **Always adapt code to the existing schema** — read columns first, then write routes/serializers to match.
- **If a schema mismatch is found, STOP and ask** before making any database changes.
- **Protect all production data.** No destructive writes, no column drops, no truncates.

## Gotchas

- After changing `lib/db/src/schema/`, run `pnpm run typecheck:libs` before typechecking artifacts — stale declarations cause false "no exported member" errors.
- Telegram WebApp cookie `sameSite` must be `"none"` + `secure: true` in production for cross-origin WebView sessions to work.
- The Orval codegen produces `<OperationIdPascal>Body` Zod names — never name `components/schemas` entries with that pattern or you'll get TS2308 collisions.

## Phase 14 Baseline Verification (2026-07-09)

Restored from GitHub import into fresh Replit workspace. All checks executed against live environment.

| Check | Result |
|---|---|
| Dependencies (`pnpm install`) | ✅ 486 packages installed, lockfile unchanged |
| Secrets present | ✅ DATABASE_URL, SESSION_SECRET, TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME |
| API Server workflow | ✅ Running on port 8080 |
| Frontend workflow | ✅ Running on port 21494 |
| Database connectivity | ✅ Verified via API server startup (`Database connectivity OK`) |
| DB schema (users table) | ✅ All 17 columns present, schema verification complete |
| TypeScript check (`pnpm run typecheck`) | ✅ 0 errors |
| Production build (api-server + hustlecoin) | ✅ Built successfully |
| Auth flow (session/cookie middleware) | ✅ Active — 401 returned correctly for unauthenticated browser requests |
| Mockup-sandbox build | ⚠️ Pre-existing failure — PORT required at Vite config eval time during build (dev server runs fine) |
| Git snapshot | ✅ `Pre Phase 14 Stable Baseline` committed at HEAD |

**Overall health: Green.** No application code was modified. Ready for Phase 14 development.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
