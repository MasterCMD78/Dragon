import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roadmapPhasesTable = pgTable("roadmap_phases", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("planned"), // planned | in_progress | completed
  progress: integer("progress").notNull().default(0), // 0–100
  targetDate: text("target_date"), // e.g. "Q3 2025"
  sortOrder: integer("sort_order").notNull().default(0),
  items: text("items").array().notNull().default([]), // checklist items
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRoadmapPhaseSchema = createInsertSchema(roadmapPhasesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRoadmapPhase = z.infer<typeof insertRoadmapPhaseSchema>;
export type RoadmapPhase = typeof roadmapPhasesTable.$inferSelect;
