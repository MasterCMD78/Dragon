---
name: Phase 14 Grant System Design
description: Design decisions and safety patterns for the Global HP Grant system in HustleCoin admin panel
---

# Phase 14 Grant System Design

## Key decisions

**Super Admin (7035629762) immunity pattern:**
- auth.ts: Super Admin takes a separate branch that bypasses the ban gate entirely AND repairs `isAdmin=true, isBanned=false` atomically on every login
- admin.ts: `SUPER_ADMIN_TELEGRAM_ID` constant guards ban and remove-admin endpoints with early 403
- New user INSERT sets `isAdmin: true` when telegramId matches

**Why:** Any ban/admin-strip (via direct DB edit or future bug) must be self-healing on next login, not require manual intervention.

**Grant transaction atomicity:**
- Audit log (`adminLogsTable`) is written INSIDE the same DB transaction as balance updates and transaction records
- If audit write fails, the entire grant rolls back — no orphaned grants without audit trail

**Grant recipient-set correctness:**
- SELECT non-banned users with `.for("update")`, capture the locked ID set
- UPDATE uses `inArray(usersTable.telegramId, lockedIds)` in 500-row chunks — NOT `WHERE isBanned=false`
- Prevents new/unbanned users created between SELECT and UPDATE from receiving HP without a transaction record

**Rollback race safety:**
- `pg_advisory_xact_lock(hashtext('rollback_grant_' + batchId))` serialises concurrent rollback calls
- Duplicate check, audit log insert, and balance deductions all inside one transaction
- In-transaction revalidation: re-queries latest grant by `(createdAt DESC, id DESC)` and compares ID — throws `GRANT_SUPERSEDED` (409) if a newer grant committed between initial lookup and rollback

**Ordering convention:**
- All "find latest grant" queries use `.orderBy(desc(createdAt), desc(id))` for deterministic tie-breaking

**Known intentional trade-off:**
- Rollback deducts `grantAmount` from current balance (floor 0) rather than restoring exact pre-grant balances
- This is correct: it removes granted HP from circulation without undoing legitimate post-grant activity (mining, quests)
- Only edge case: users who spent more than their current balance post-grant get floored to 0 (acceptable for emergency rollback)

**Remaining gap (not critical for production with low concurrency):**
- Best-effort duplicate grant guard (same amount+reason in 10 min) runs outside the transaction — two concurrent identical requests can both pass before either commits. Fix requires DB-level unique constraint on idempotency key.

## Rollback panel — server-driven state

`GET /admin/grant-everyone/last` returns `{ lastGrant, canRollback }` from server so the rollback panel persists across page reloads and across admin devices. Dashboard fetches on mount via `getLastGrant()`.
