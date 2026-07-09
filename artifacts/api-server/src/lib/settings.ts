/**
 * System settings reader.
 * Reads configurable values from the system_settings table.
 * Falls back to hardcoded defaults when a row is absent.
 */
import { db, systemSettingsTable, SETTING_KEYS, SETTING_DEFAULTS } from "@workspace/db";
import { eq } from "drizzle-orm";

type TxClient = Parameters<Parameters<(typeof db)["transaction"]>[0]>[0];

/** Read a single setting, returning its default if absent. */
export async function getSetting(key: string): Promise<string> {
  const [row] = await db
    .select({ value: systemSettingsTable.value })
    .from(systemSettingsTable)
    .where(eq(systemSettingsTable.key, key))
    .limit(1);
  return row?.value ?? (SETTING_DEFAULTS as Record<string, string>)[key] ?? "";
}

/** Read a single setting inside a transaction. */
export async function getSettingInTx(tx: TxClient, key: string): Promise<string> {
  const [row] = await tx
    .select({ value: systemSettingsTable.value })
    .from(systemSettingsTable)
    .where(eq(systemSettingsTable.key, key))
    .limit(1);
  return row?.value ?? (SETTING_DEFAULTS as Record<string, string>)[key] ?? "";
}

/** Read all settings as a plain object, merging in defaults for absent keys. */
export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.select().from(systemSettingsTable);
  const result: Record<string, string> = { ...SETTING_DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export { SETTING_KEYS };
