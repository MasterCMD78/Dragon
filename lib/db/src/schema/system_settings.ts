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
  // Website admin auth
  ADMIN_WEBSITE_PASSWORD_HASH: "admin_website_password_hash",
  // Social links
  SOCIAL_TELEGRAM: "social_telegram",
  SOCIAL_TWITTER: "social_twitter",
  SOCIAL_DISCORD: "social_discord",
  SOCIAL_INSTAGRAM: "social_instagram",
  SOCIAL_TIKTOK: "social_tiktok",
  SOCIAL_YOUTUBE: "social_youtube",
  SOCIAL_MEDIUM: "social_medium",
  SOCIAL_GITHUB: "social_github",
  // Content management — hero
  CONTENT_HERO_BADGE: "content_hero_badge",
  CONTENT_HERO_TITLE: "content_hero_title",
  CONTENT_HERO_SUBTITLE: "content_hero_subtitle",
  CONTENT_HERO_CTA_PRIMARY: "content_hero_cta_primary",
  CONTENT_HERO_CTA_SECONDARY: "content_hero_cta_secondary",
  // Content management — about
  CONTENT_ABOUT_HEADLINE: "content_about_headline",
  CONTENT_ABOUT_BODY: "content_about_body",
  // Content management — footer
  CONTENT_FOOTER_TAGLINE: "content_footer_tagline",
  // Content management — contact
  CONTENT_CONTACT_EMAIL: "content_contact_email",
  CONTENT_CONTACT_NOTE: "content_contact_note",
} as const;

/** Default values used when the row is absent */
export const SETTING_DEFAULTS = {
  [SETTING_KEYS.WELCOME_BONUS_ENABLED]: "true",
  [SETTING_KEYS.WELCOME_BONUS_AMOUNT]: "250",
  [SETTING_KEYS.REFERRAL_BONUS_AMOUNT]: "500",
  [SETTING_KEYS.SOCIAL_TELEGRAM]: "https://t.me/HustleCoinMinerBot",
  [SETTING_KEYS.SOCIAL_TWITTER]: "",
  [SETTING_KEYS.SOCIAL_DISCORD]: "",
  [SETTING_KEYS.SOCIAL_INSTAGRAM]: "",
  [SETTING_KEYS.SOCIAL_TIKTOK]: "",
  [SETTING_KEYS.SOCIAL_YOUTUBE]: "",
  [SETTING_KEYS.SOCIAL_MEDIUM]: "",
  [SETTING_KEYS.SOCIAL_GITHUB]: "",
  [SETTING_KEYS.CONTENT_HERO_BADGE]: "The New Standard in Telegram Mining",
  [SETTING_KEYS.CONTENT_HERO_TITLE]: "Powered by the Hustle.",
  [SETTING_KEYS.CONTENT_HERO_SUBTITLE]: "Mine HP daily, build your streak, climb the leaderboards, and join the most driven community in Web3. No noise, just execution.",
  [SETTING_KEYS.CONTENT_HERO_CTA_PRIMARY]: "Start Mining",
  [SETTING_KEYS.CONTENT_HERO_CTA_SECONDARY]: "Join Telegram",
  [SETTING_KEYS.CONTENT_ABOUT_HEADLINE]: "Built for those who show up every day.",
  [SETTING_KEYS.CONTENT_ABOUT_BODY]: "HustleCoin is not a promise. It is a record. Every HP you earn is proof of consistency — mined by your hands, tracked on-chain, earned through discipline.",
  [SETTING_KEYS.CONTENT_FOOTER_TAGLINE]: "Powered by the Hustle.",
  [SETTING_KEYS.CONTENT_CONTACT_EMAIL]: "support@hustlecoin.app",
  [SETTING_KEYS.CONTENT_CONTACT_NOTE]: "We typically respond within 24–48 hours via Telegram.",
} as const;
