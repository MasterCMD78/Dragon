---
name: Database migration
description: Neon DB replaced with fresh instance; schema push + seed approach documented here.
---

# Database Migration — Fresh Neon Instance

## What happened
The original Neon compute endpoint (`ep-gentle-dream-aq2ool93`) was hard-disabled. User replaced DATABASE_URL secret with a new Neon database.

## How schema was applied
`pnpm run push-force` in `lib/db/` — runs `drizzle-kit push --force --config ./drizzle.config.ts`. This is the canonical way to push schema to a fresh DB in this project. No separate migration files exist; Drizzle schema is the source of truth.

## All 16 tables created
achievement_unlocks, achievements, admin_logs, announcements, feedback, mining_logs, notification_settings, notifications, quest_progress, quests, referral_events, referrals, task_completions, tasks, transactions, users

## Seeds (auto-run at startup via checkDbAndMigrateSchema → ensureSeed*)
- **achievements**: 22 rows (from ACHIEVEMENT_DEFS in achievement-engine.ts)
- **quests**: 6 rows (from SEED_QUESTS in quests.ts)
- **tasks**: 5 rows (from SEED_TASKS in tasks.ts)

All seeders are idempotent (title-matched, INSERT only if missing).

## ALLOW_DEV_BYPASS
Set in development env vars (`setEnvVars({ environment: "development", values: { ALLOW_DEV_BYPASS: "true" } })`). Allows `POST /api/auth/telegram` with `{"initData":"dev_bypass:999999999"}` for local testing without a real Telegram token. NOT set in production.

**Why:** Testing auth locally without real Telegram Mini App context requires bypassing HMAC validation. The flag is double-gated: env var must be "true" AND initData must start with "dev_bypass".

## Key verified endpoints (all 200 after migration)
health, auth/telegram, auth/me, mining/*, wallet/transactions, leaderboard/*, referrals/*, tasks, quests, achievements, notifications/*, users/me, admin/stats, admin/users, ban system

## Note on wallet
No `/api/wallet/balance` endpoint exists. Balance is included in `/api/wallet/transactions` response. This is intentional.
