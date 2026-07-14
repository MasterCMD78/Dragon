import { pool } from "@workspace/db";
import { SETTING_KEYS, SETTING_DEFAULTS } from "@workspace/db";
import { logger } from "./logger";

/**
 * Columns that MUST exist in the production `users` table.
 * Each entry specifies the column name and the DDL to add it if missing.
 * All additions use IF NOT EXISTS so they are idempotent and safe to re-run.
 */
const REQUIRED_USER_COLUMNS: Array<{
  column: string;
  ddl: string;
}> = [
  {
    column: "mining_session_start",
    ddl: "ALTER TABLE users ADD COLUMN IF NOT EXISTS mining_session_start TIMESTAMPTZ",
  },
  {
    column: "is_admin",
    ddl: "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false",
  },
  {
    column: "is_banned",
    ddl: "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false",
  },
  {
    column: "balance",
    ddl: "ALTER TABLE users ADD COLUMN IF NOT EXISTS balance INTEGER NOT NULL DEFAULT 0",
  },
  {
    column: "language_code",
    ddl: "ALTER TABLE users ADD COLUMN IF NOT EXISTS language_code TEXT",
  },
];

/**
 * Check that the database is reachable and that all required schema columns
 * exist in the `users` table. Adds any missing columns via safe DDL.
 *
 * Logs a clear error (including the full pg error message) if the endpoint
 * is disabled or unreachable, so it is never silently swallowed.
 */
/**
 * Returns true if DB is reachable and schema is valid (or was successfully
 * migrated). Returns false if the DB is unreachable so callers can skip
 * work that requires a live database.
 */
export async function checkDbAndMigrateSchema(): Promise<boolean> {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    // Surface the real error — this is where "endpoint has been disabled" appears.
    // The pino serializer (serializeErrorChain) will walk err.cause and emit
    // pgCode, pgDetail, and the full pg error message.
    logger.error(
      { err },
      "DATABASE CONNECTION FAILED — cannot reach PostgreSQL. " +
        "If using Neon, the compute endpoint may be suspended or disabled. " +
        "Re-enable it at console.neon.tech and redeploy.",
    );
    return false;
  }

  try {
    // 1. Verify basic connectivity
    await client.query("SELECT 1");
    logger.info("Database connectivity OK");

    // 2. Check which columns already exist in the users table
    const { rows: existingCols } = await client.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'users'`,
    );
    const existing = new Set(existingCols.map((r) => r.column_name));
    logger.info(
      { columns: [...existing].sort() },
      "Production users table columns",
    );

    // 3. Add any missing columns (idempotent — all use IF NOT EXISTS)
    for (const { column, ddl } of REQUIRED_USER_COLUMNS) {
      if (!existing.has(column)) {
        logger.warn(
          { column },
          `Column missing from users table — adding: ${ddl}`,
        );
        await client.query(ddl);
        logger.info({ column }, "Column added successfully");
      }
    }

    logger.info("Schema verification complete — all required columns present");

    // 4. Create system_settings table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_by_telegram_id TEXT
      )
    `);

    // 4b. Create the connect-pg-simple session table if it doesn't exist.
    // Schema matches connect-pg-simple's own table-creation.sql exactly —
    // required because we run with createTableIfMissing: false (see
    // middlewares/session.ts for why).
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")
    `);
    logger.info("Session table ready");

    // 4c. Hot-path indexes — these tables are filtered by telegram_id on
    // nearly every request (mining, wallet, referrals, quests, tasks,
    // achievements, notifications) but had no supporting index, forcing a
    // sequential scan as each table grows. Idempotent, safe to run on every
    // boot.
    await client.query(`
      CREATE INDEX IF NOT EXISTS "mining_logs_telegram_id_idx" ON "mining_logs" ("telegram_id");
      CREATE INDEX IF NOT EXISTS "transactions_telegram_id_idx" ON "transactions" ("telegram_id");
      CREATE INDEX IF NOT EXISTS "referrals_referrer_telegram_id_idx" ON "referrals" ("referrer_telegram_id");
      CREATE INDEX IF NOT EXISTS "referrals_referee_telegram_id_idx" ON "referrals" ("referee_telegram_id");
      CREATE INDEX IF NOT EXISTS "task_completions_telegram_id_idx" ON "task_completions" ("telegram_id");
      CREATE INDEX IF NOT EXISTS "quest_progress_telegram_id_idx" ON "quest_progress" ("telegram_id");
      CREATE INDEX IF NOT EXISTS "achievement_unlocks_telegram_id_idx" ON "achievement_unlocks" ("telegram_id");
      CREATE INDEX IF NOT EXISTS "notifications_telegram_id_idx" ON "notifications" ("telegram_id");
    `);
    logger.info("Hot-path indexes ready");

    // 5. Seed default settings (INSERT … ON CONFLICT DO NOTHING = idempotent)
    const defaults = Object.entries(SETTING_DEFAULTS);
    for (const [key, value] of defaults) {
      await client.query(
        `INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
        [key, value],
      );
    }
    logger.info({ count: defaults.length }, "System settings table ready");

    return true;
  } catch (err) {
    logger.error({ err }, "Schema verification/migration failed");
    return false;
  } finally {
    client.release();
  }
}
