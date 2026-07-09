import app from "./app";
import { logger } from "./lib/logger";
import { ensureSeedTasks } from "./lib/tasks";
import { ensureSeedQuests } from "./lib/quests";
import { ensureSeedAchievements } from "./lib/achievement-seed";
import { checkDbAndMigrateSchema } from "./lib/db-health";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Warn on startup if TELEGRAM_APP_SHORT_NAME is absent — referral links will
// fall back to ?start= format which loses start_param for brand-new Telegram
// users (they go through the bot START flow first). Set this env var to the
// Mini App short name configured in BotFather to enable the ?startapp= format
// that always passes start_param in initData for both new and returning users.
if (!process.env.TELEGRAM_APP_SHORT_NAME) {
  // Using console.warn here because logger isn't set up yet at module level.
  // This runs once at process start before any requests.
  console.warn(
    "[WARN] TELEGRAM_APP_SHORT_NAME is not set. " +
      "Referral links will use ?start= format (bot link) instead of ?startapp= (Mini App direct link). " +
      "Brand-new Telegram users may lose start_param when the bot chat opens before the Mini App. " +
      "Set TELEGRAM_APP_SHORT_NAME to your BotFather Mini App short name to fix referral attribution for new users.",
  );
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Run DB health check + schema migration first, then seed static data.
  // checkDbAndMigrateSchema returns true on success, false on failure.
  // Seeds are skipped when the DB is unreachable to avoid cascading errors.
  checkDbAndMigrateSchema()
    .then((dbReady) => {
      if (!dbReady) {
        logger.warn(
          "Skipping seed tasks — DB is not ready (see above for connection error)",
        );
        return;
      }
      ensureSeedTasks().catch((seedErr) => {
        logger.error({ err: seedErr }, "Failed to seed tasks");
      });
      ensureSeedQuests().catch((seedErr) => {
        logger.error({ err: seedErr }, "Failed to seed quests");
      });
      ensureSeedAchievements().catch((seedErr) => {
        logger.error({ err: seedErr }, "Failed to seed achievements");
      });
    })
    .catch((err) => {
      logger.error({ err }, "DB health check threw unexpectedly");
    });
});
