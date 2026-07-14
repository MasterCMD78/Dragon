---
name: CSRF, persistent sessions, rate limiting (HustleCoin API)
description: Security hardening decisions for artifacts/api-server — double-submit CSRF, connect-pg-simple sessions, tiered rate limits. Read before touching auth/session/CSRF middleware.
---

# Security hardening — auth/session/CSRF/rate-limit

## Why double-submit-cookie CSRF (not `csurf`)
Session cookie must be `SameSite=None` because the Telegram Mini App runs the
frontend in a cross-origin WebView. That makes the session cookie alone
forgeable cross-site. Double-submit (readable `csrf_token` cookie mirrored
into an `x-csrf-token` header by the frontend) closes the gap without
breaking the WebView. `csurf` is deprecated; hand-rolled middleware lives in
`artifacts/api-server/src/middlewares/csrf.ts`.

**Exemption list is intentionally short and explicit** (`/api/auth/telegram`,
`/api/admin/website-auth/login`, `/api/public/contact`,
`/api/public/analytics/track`) — only endpoints where a forged cross-site
call grants no more power than a legitimate one. Do not add exemptions
broadly; each one needs the same justification.

## Why connect-pg-simple with `createTableIfMissing: false`
Its runtime auto-create reads a `.sql` file from disk — that file doesn't
exist once the server is bundled into a single `dist/index.mjs` by esbuild,
so auto-create silently fails in production. Instead the `session` table
(standard schema: `sid`/`sess`/`expire`) is created idempotently inside
`checkDbAndMigrateSchema` (`lib/db-health.ts`), same pattern as the
`system_settings` table.

## Hot-path indexes
`mining_logs`, `transactions`, `referrals`, `task_completions`,
`quest_progress`, `achievement_unlocks`, `notifications` all get queried by
`telegram_id` on nearly every request but had no supporting index — added
via idempotent `CREATE INDEX IF NOT EXISTS` in the same `db-health.ts` step,
plus matching `index()` calls in the Drizzle schema files for future
`drizzle-kit push` parity.

## Verifying this stack
Don't trust screenshots alone — the Telegram dev-bypass screen renders
"Connecting" transiently on cold load regardless of backend correctness (see
telegram-dev-bypass-screenshot-timing.md). Verify via curl instead: login →
cookies set (`csrf_token` + `connect.sid`) → mutating request without
`x-csrf-token` header returns 403 → with header succeeds → logout destroys
session → `/auth/me` then 401. This full loop was confirmed working end to
end (login, session persistence across a fresh request, CSRF block/allow,
rate-limit headers, admin authorization, public-route exemption).

## Rate limiting caveat
`express-rate-limit`'s default in-memory store is per-process, not shared
across autoscale instances. Fine for the current single-instance scale;
revisit with a shared store (e.g. rate-limit-postgresql) if the deployment
ever runs multiple concurrent instances and precise global quotas matter.
