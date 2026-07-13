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
  sessionId: text("session_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SiteAnalytic = typeof siteAnalyticsTable.$inferSelect;
