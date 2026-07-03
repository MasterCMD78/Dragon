/**
 * Achievement seeder — ensures all achievement rows defined in the registry
 * exist in the database. Title-matched, never duplicates existing rows.
 * Safe to call on every server start.
 */

import { db, achievementsTable } from "@workspace/db";
import { logger } from "./logger";
import { ACHIEVEMENT_DEFS } from "./achievement-engine";

export async function ensureSeedAchievements(): Promise<void> {
  const existing = await db
    .select({ title: achievementsTable.title })
    .from(achievementsTable);

  const existingTitles = new Set(existing.map((r) => r.title));

  const toInsert = ACHIEVEMENT_DEFS.filter(
    (def) => !existingTitles.has(def.title),
  ).map((def) => ({
    title: def.title,
    description: def.description,
    icon: def.icon,
  }));

  if (toInsert.length === 0) {
    logger.info("Achievement seed: all achievements already present");
    return;
  }

  await db.insert(achievementsTable).values(toInsert);

  logger.info(
    { count: toInsert.length, titles: toInsert.map((a) => a.title) },
    "Achievement seed: inserted new achievements",
  );
}
