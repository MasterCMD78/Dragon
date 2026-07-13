import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const websiteAnnouncementsTable = pgTable("website_announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("banner"), // banner | popup | alert | maintenance | emergency | version_update
  isActive: boolean("is_active").notNull().default(true),
  isDismissible: boolean("is_dismissible").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  ctaLabel: text("cta_label"),
  ctaUrl: text("cta_url"),
  createdByTelegramId: text("created_by_telegram_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWebsiteAnnouncementSchema = createInsertSchema(websiteAnnouncementsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWebsiteAnnouncement = z.infer<typeof insertWebsiteAnnouncementSchema>;
export type WebsiteAnnouncement = typeof websiteAnnouncementsTable.$inferSelect;
