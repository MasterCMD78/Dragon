import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const systemSettingsTable = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedByTelegramId: text("updated_by_telegram_id"),
});

export type SystemSetting = typeof systemSettingsTable.$inferSelect;

/** Canonical setting keys */
export const SETTING_KEYS = {
  WELCOME_BONUS_ENABLED: "welcome_bonus_enabled",
  WELCOME_BONUS_AMOUNT: "welcome_bonus_amount",
  REFERRAL_BONUS_AMOUNT: "referral_bonus_amount",
} as const;

/** Default values used when the row is absent */
export const SETTING_DEFAULTS = {
  [SETTING_KEYS.WELCOME_BONUS_ENABLED]: "true",
  [SETTING_KEYS.WELCOME_BONUS_AMOUNT]: "250",
  [SETTING_KEYS.REFERRAL_BONUS_AMOUNT]: "500",
} as const;
