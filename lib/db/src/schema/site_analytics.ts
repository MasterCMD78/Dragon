import {
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const siteAnalyticsTable = pgTable("site_analytics", {
  id: serial("id").primaryKey(),
  path: text("path").notNull(),
  referrer: text("referrer"),
  deviceType: text("device_type").notNull().default("unknown"), // mobile | desktop | tablet | unknown
  country: text("country"),
  city: text("city"),
  browser: text("browser"),  // Chrome | Firefox | Safari | Edge | Opera | Other
  os: text("os"),            // Windows | macOS | Android | iOS | Linux | Other
  trafficSource: text("traffic_source"), // Google | TikTok | Telegram | X | Facebook | Instagram | Discord | Direct | Referral | Unknown
  sessionId: text("session_id"),
  visitorId: text("visitor_id"), // persistent across sessions for returning/new detection
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SiteAnalytic = typeof siteAnalyticsTable.$inferSelect;
