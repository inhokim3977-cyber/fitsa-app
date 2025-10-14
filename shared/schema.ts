import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Virtual Fitting schema - stores fitting results
export const virtualFittings = pgTable("virtual_fittings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userPhotoPath: text("user_photo_path").notNull(),
  clothingPhotoPath: text("clothing_photo_path").notNull(),
  resultPhotoPath: text("result_photo_path"),
  status: text("status").notNull().default("processing"), // processing, completed, failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVirtualFittingSchema = createInsertSchema(virtualFittings).omit({
  id: true,
  createdAt: true,
});

export type InsertVirtualFitting = z.infer<typeof insertVirtualFittingSchema>;
export type VirtualFitting = typeof virtualFittings.$inferSelect;

// User schema (keeping existing structure)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
