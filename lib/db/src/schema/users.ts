import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    telegramId: text("telegram_id").notNull(),
    username: text("username").notNull().default(""),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    balance: integer("balance").notNull().default(0),
    level: integer("level").notNull().default(1),
    streak: integer("streak").notNull().default(0),
    totalMines: integer("total_mines").notNull().default(0),
    lastMine: timestamp("last_mine", { withTimezone: true }),
    referredBy: text("referred_by"),
    isAdmin: boolean("is_admin").notNull().default(false),
    lastActive: timestamp("last_active", { withTimezone: true })
      .notNull()
      .defaultNow(),
    joinDate: timestamp("join_date", { withTimezone: true })
      .notNull()
      .defaultNow(),
    languageCode: text("language_code"),
    isBanned: boolean("is_banned").notNull().default(false),
    miningSessionStart: timestamp("mining_session_start", {
      withTimezone: true,
    }),
  },
  (table) => [uniqueIndex("users_telegram_id_idx").on(table.telegramId)],
);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  joinDate: true,
  lastActive: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
