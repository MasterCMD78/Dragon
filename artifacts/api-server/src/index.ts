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
