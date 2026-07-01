import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const feedbackTable = pgTable("feedback", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull(),
  message: text("message").notNull(),
  adminReply: text("admin_reply"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const adminLogsTable = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  adminTelegramId: text("admin_telegram_id").notNull(),
  action: text("action").notNull(),
  targetTelegramId: text("target_telegram_id"),
  details: text("details"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const referralEventsTable = pgTable("referral_events", {
  id: serial("id").primaryKey(),
  referrerTelegramId: text("referrer_telegram_id"),
  refereeTelegramId: text("referee_telegram_id").notNull(),
  step: text("step").notNull(),
  result: text("result").notNull(),
  message: text("message"),
  source: text("source"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertFeedbackSchema = createInsertSchema(feedbackTable).omit({
  id: true,
  createdAt: true,
});
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedbackTable.$inferSelect;
export type AdminLog = typeof adminLogsTable.$inferSelect;
export type ReferralEvent = typeof referralEventsTable.$inferSelect;
