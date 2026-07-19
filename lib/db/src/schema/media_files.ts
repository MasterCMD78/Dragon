import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const mediaFilesTable = pgTable("media_files", {
  id: serial("id").primaryKey(),
  objectPath: text("object_path").notNull(), // e.g. /objects/uploads/<uuid>
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type MediaFile = typeof mediaFilesTable.$inferSelect;
export type InsertMediaFile = typeof mediaFilesTable.$inferInsert;
