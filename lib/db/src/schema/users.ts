import {
  pgTable,
  serial,
  text,
  numeric,
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
    username: text("username"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name"),
    photoUrl: text("photo_url"),
    hpBalance: numeric("hp_balance", { precision: 20, scale: 4 })
      .notNull()
      .default("0"),
    totalMined: numeric("total_mined", { precision: 20, scale: 4 })
      .notNull()
      .default("0"),
    referralCode: text("referral_code").notNull(),
    referredById: integer("referred_by_id"),
    miningStreak: integer("mining_streak").notNull().default(0),
    lastMinedAt: timestamp("last_mined_at", { withTimezone: true }),
    isAdmin: boolean("is_admin").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("users_telegram_id_idx").on(table.telegramId), uniqueIndex("users_referral_code_idx").on(table.referralCode)],
);

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
