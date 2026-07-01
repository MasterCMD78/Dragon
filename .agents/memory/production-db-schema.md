---
name: Production DB schema
description: Column name differences between production DB and what you might assume; critical for routes and serialization.
---

## Hard rules — apply before every phase, no exceptions

1. **Never run `db push` or `db migrate`** against the production database.
2. **Never recreate production tables.** All 16 tables are owned by the existing Neon DB.
3. **Always adapt code to the existing schema.** Read the table columns first, then write routes and serializers to match.
4. **If a schema mismatch is found, STOP and ask** before making any database changes.
5. **Protect all production data.** No destructive writes, no column drops, no truncates.

## Production schema is already set — never run `db push` or `db migrate` against it

The production Neon DB has 16 tables. All are mapped to Drizzle in `lib/db/src/schema/`.

## Critical column name differences (users table)

| Concept | Production column | Wrong assumption |
|---|---|---|
| HP balance | `balance` (integer) | `hp_balance` or `hpBalance` |
| Mining streak | `streak` | `mining_streak` or `miningStreak` |
| Mine count | `total_mines` | `total_mined` |
| Last mine time | `last_mine` | `last_mined_at` |
| Join date | `join_date` | `created_at` |
| Referrer | `referred_by` (text, telegram_id) | `referred_by_id` (integer) |
| No referral_code column | — use `telegramId` as referral code | `referral_code` |
| No photo_url column | — Telegram provides dynamically | `photo_url` |

**Why:** The production DB was built by a previous version of the project with different naming conventions.

## Referral code convention

There is no `referral_code` column. A user's referral code IS their `telegram_id`. Bot deep links use `t.me/{BOT_USERNAME}?start={telegram_id}`. On signup, `referred_by` stores the referrer's `telegram_id` (text, not int).

## Table list (all 16)

users, referrals, transactions, mining_logs, tasks, task_completions, quests, quest_progress, achievements, achievement_unlocks, notifications, notification_settings, announcements, feedback, admin_logs, referral_events

## Key counts (as of 2026-07-01)

397 users, 101 referrals, 481 transactions, 7 achievements, 3 quests, 974 mining_logs, 18 tasks, 2603 task_completions, 1510 quest_progress, 920 achievement_unlocks, 85 notifications, 0 announcements
