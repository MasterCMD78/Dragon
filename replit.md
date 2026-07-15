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

## Restored from GitHub import (2026-07-14, re-run same day after a second container reset)

Container reset a second time the same day, wiping artifact/workflow registration and secrets again (code on disk was untouched). Re-ran the same restoration: `pnpm install` (490 packages), re-registered the 4 artifacts (api-server, hustlecoin, website, mockup-sandbox) with their workflows, and the user re-supplied `DATABASE_URL`/`TELEGRAM_BOT_TOKEN`/`TELEGRAM_BOT_USERNAME` secrets. All 4 workflows are running; `/api/healthz` returns 200; `pnpm run typecheck` passes clean across all packages; website homepage renders correctly. No application code was changed.

An attached brief (in `attached_assets/`) requests finishing Phase 3 verification (visual QA of website/admin/Telegram mini app, CRUD checks, test-data cleanup, a PHASE3_COMPLETION.md report, and a Phase 4 roadmap) — that is substantial verification/QA work beyond project setup, so it has been proposed as a follow-up task rather than done here.

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

## Phase 14 Complete (2026-07-09)

### Referral Bug Fix

**Root cause found:** The `start_param` was never present in Telegram `initData` when new users opened the Mini App. The referral link format `t.me/Bot?start=<code>` routes brand-new users through the bot chat START flow — when the Mini App subsequently opens from a keyboard button, Telegram strips `start_param` from `initData`. Evidence: 90 production users, 0 referrals, 0 `referred_by` values in the DB.

**Fixes applied:**
- `artifacts/api-server/src/routes/referrals.ts`: `buildReferralLink` now generates `t.me/<bot>/<appShortName>?startapp=<telegramId>` when `TELEGRAM_APP_SHORT_NAME` is set. This format directly opens the Mini App for both new and returning users and always passes `start_param`. Falls back to `?start=` format when the env var is absent.
- `artifacts/hustlecoin/src/contexts/AuthContext.tsx`: Frontend now sends `initDataUnsafe.start_param` as explicit `referralCode` (belt-and-suspenders; covers edge cases where the backend extraction path differs).
- `artifacts/api-server/src/routes/auth.ts`: Added detailed referral candidate logging (`startParam`, `referralCode`, `candidateReferrerId`) for every new user registration. Organic signups and referrer-not-found cases now write to `referral_events` table.
- `artifacts/api-server/src/lib/referral-engine.ts`: Now writes referral events at every step (duplicate_check, bonus_check, referrer_lookup, complete) using the existing `referral_events` table for production debugging.

**Action required:** Set `TELEGRAM_APP_SHORT_NAME` secret to your Mini App's short name from BotFather. The API server logs a warning on startup if it's missing.

### Welcome Bonus Controls (Super Admin)

New `system_settings` table (auto-created by `db-health.ts` with idempotent DDL — no manual migration needed).

**Settings:**
- `welcome_bonus_enabled` (default: `"true"`) — if `"false"`, no referral rewards are issued at all
- `welcome_bonus_amount` (default: `"250"`) — HP awarded to the new user who joins via referral
- `referral_bonus_amount` (default: `"500"`) — HP awarded to the existing user who made the referral

**Admin API endpoints (Super Admin only — 403 for regular admins):**
- `GET /admin/settings` — read all settings
- `PUT /admin/settings` — update settings; every change is audit-logged with Admin ID, Telegram ID, username, old value, new value, timestamp

**Frontend:** New "Settings" tab in the Admin Panel. Toggle for enable/disable, numeric inputs with quick-select presets for both bonus amounts. Save button only enables when there are unsaved changes.

**Files added/changed:**
- `lib/db/src/schema/system_settings.ts` — new schema
- `artifacts/api-server/src/lib/settings.ts` — DB reader helpers
- `artifacts/api-server/src/lib/db-health.ts` — auto-creates table + seeds defaults
- `artifacts/api-server/src/routes/admin.ts` — GET/PUT /admin/settings (Super Admin gated)
- `artifacts/hustlecoin/src/lib/adminApi.ts` — `getSettings()`, `updateSettings()`
- `artifacts/hustlecoin/src/pages/admin/Settings.tsx` — new settings UI
- `artifacts/hustlecoin/src/pages/admin/AdminLayout.tsx` — Settings nav item
- `artifacts/hustlecoin/src/pages/admin/index.tsx` — /admin/settings route

| Verification | Result |
|---|---|
| TypeScript (`pnpm run typecheck`) | ✅ 0 errors |
| Production build (`pnpm run build`) | ✅ 0 errors (mockup-sandbox pre-existing failure excluded) |
| API server | ✅ Running — system_settings table created with 3 default rows |
| Frontend | ✅ Running |

## Phase 14 Re-import Recovery (2026-07-13)

Re-imported into a fresh Replit workspace a second time; the artifact registry (workflows) was empty even though `.replit-artifact/artifact.toml` files existed on disk. Registering the `hustlecoin` artifact via `createArtifact` re-adopted all four artifacts and their workflows, but also overwrote `artifacts/hustlecoin/*` with generic scaffold files — the real frontend source (all pages, Layout.tsx, etc.) was restored from a pre-recreation backup. `website`, `api-server`, and `mockup-sandbox` directories were unaffected.

Also added `VITE_ALLOW_DEV_BYPASS=true` (development env) so the frontend's dev-bypass login path activates in the browser preview — it was previously only set as backend `ALLOW_DEV_BYPASS`, which Vite does not expose to client code without the `VITE_` prefix.

| Check | Result |
|---|---|
| `pnpm install` | ✅ 486 packages |
| All 4 workflows (hustlecoin, website, api-server, mockup-sandbox) | ✅ running |
| Database connectivity + schema verification | ✅ all required columns present |
| Telegram auth (dev bypass) | ✅ `POST /api/auth/telegram` returns 200, session cookie set |
| Website homepage | ✅ renders |

## Phase 14 Re-import Recovery #2 (2026-07-14)

Re-imported into a fresh Replit workspace a third time; artifact registry was empty again (`listArtifacts()` returned `[]`) even though all four `.replit-artifact/artifact.toml` files existed on disk. Recovery procedure used:

1. Backed up all 4 artifact directories (`api-server`, `hustlecoin`, `mockup-sandbox`, `website`) to `/tmp`.
2. Moved `artifacts/hustlecoin` aside (directory must not exist for `createArtifact` to run) and called `createArtifact({ artifactType: "react-vite", slug: "hustlecoin", previewPath: "/", title: "HustleCoin V2" })`. This single call auto-registered all 4 sibling artifacts (confirmed via `automatic_updates`) and regenerated `hustlecoin` as scaffold — `website`, `api-server`, `mockup-sandbox` directories were untouched.
3. Restored real `hustlecoin` source from the backup, keeping only the freshly-generated `.replit-artifact/artifact.toml`.
4. `pnpm install`, restarted all 4 workflows — all came up clean.

Added `DATABASE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` secrets (were missing after this re-import; `SESSION_SECRET` and `ALLOW_DEV_BYPASS`/`VITE_ALLOW_DEV_BYPASS` were already present).

| Check | Result |
|---|---|
| `pnpm install` | ✅ up to date, 10 workspace projects |
| All 4 workflows (hustlecoin, website, api-server, mockup-sandbox) | ✅ running |
| Database connectivity + schema verification | ✅ all required `users` columns present |
| Telegram auth (dev bypass), verified via curl against the real dev domain | ✅ `POST /api/auth/telegram` → 200, `Secure; SameSite=None` cookie set, follow-up `GET /api/auth/me` → 200 |
| Website homepage | ✅ renders |

Note: screenshotting the `hustlecoin` root right after a fresh page load can show the "CONNECTING" spinner indefinitely — `AuthContext` waits up to 2s (5×400ms retries) for real Telegram `initData` before falling back to `dev_bypass`, so a screenshot taken faster than that will always look stuck even though the flow works (confirmed end-to-end via curl above).

## Session: CSRF fix verification + re-import recovery (2026-07-15)

Continued from a previous session that had already written the CSRF frontend fix (`artifacts/website/src/lib/api.ts` mirrors the `csrf_token` cookie into `X-CSRF-Token` on every unsafe request; commit `fix: complete csrf frontend token handling` was already on `main`/GitHub before this session started). This session re-registered the artifact workflows (empty again after a container reset — same recovery as prior sessions) and ran full end-to-end verification of the CSRF fix.

**Verification performed (dev environment):**
- Confirmed `ensureCsrfToken`/`requireCsrf` middleware round-trip works: a GET issues the `csrf_token` cookie, an unsafe request without/with-wrong `X-CSRF-Token` header correctly gets `403 CSRF token missing or invalid`, and a request with the matching header passes CSRF and reaches the next layer (`401 Not authenticated` when unauthenticated, as expected).
- Logged in via existing Telegram dev-bypass (`dev_bypass:7035629762`, the hardcoded Super Admin ID) — did not touch the Website CMS password/login endpoint since it's a separate global setting the user already secured.
- With that authenticated session + CSRF header, exercised full CRUD end-to-end and cleaned up all test rows afterward: blog create/edit/delete, roadmap create/edit/delete, announcements create/edit/delete, contact list/patch/delete. All CSRF-gated correctly; no CSRF errors on any authenticated write.
- `pnpm run typecheck` — 0 errors across all packages. `pnpm run build` — api-server, website, hustlecoin all build clean.
- Did not test on a real Safari/iPhone device (no such device available in this environment); the cookie flags (`SameSite=None; Secure`) are already correct for both same-origin and cross-origin (Telegram WebView) cases.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
