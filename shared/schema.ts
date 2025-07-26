import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Children table - stores child information
export const children = pgTable("children", {
  id: serial("id").primaryKey(),
  parentId: varchar("parent_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  age: integer("age"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Devices table - stores device information
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").notNull().references(() => children.id),
  name: varchar("name").notNull(),
  imei: varchar("imei").notNull().unique(),
  phoneNumber: varchar("phone_number").notNull(),
  deviceType: varchar("device_type").notNull(), // 'mobile', 'tablet'
  model: varchar("model"),
  isActive: boolean("is_active").default(true),
  isLocked: boolean("is_locked").default(false),
  lastSeen: timestamp("last_seen"),
  screenTimeToday: integer("screen_time_today").default(0), // in minutes
  consentStatus: varchar("consent_status").default("pending"), // 'pending', 'approved', 'denied'
  deviceFingerprint: varchar("device_fingerprint"), // Device security fingerprint for SIM swap detection
  createdAt: timestamp("created_at").defaultNow(),
});

// Schedules table - stores shared lock schedules
export const schedules = pgTable("schedules", {
  id: serial("id").primaryKey(),
  parentId: varchar("parent_id").notNull().references(() => users.id),
  name: varchar("name").notNull(),
  startTime: varchar("start_time").notNull(), // HH:MM format
  endTime: varchar("end_time").notNull(), // HH:MM format
  daysOfWeek: varchar("days_of_week").notNull(), // JSON array of day numbers
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Device-Schedule junction table - many-to-many relationship
export const deviceSchedules = pgTable("device_schedules", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => devices.id),
  scheduleId: integer("schedule_id").notNull().references(() => schedules.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Unique constraint to prevent duplicate device-schedule pairs
  index("device_schedule_unique").on(table.deviceId, table.scheduleId)
]);

// Activity logs table - stores device activity
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => devices.id),
  action: varchar("action").notNull(), // 'lock', 'unlock', 'schedule_created', etc.
  description: text("description"),
  metadata: jsonb("metadata"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Location logs table - stores device location data
export const locationLogs = pgTable("location_logs", {
  id: serial("id").primaryKey(),
  deviceId: integer("device_id").notNull().references(() => devices.id),
  latitude: numeric("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: numeric("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: numeric("accuracy", { precision: 8, scale: 2 }), // in meters
  address: text("address"), // reverse geocoded address
  locationMethod: varchar("location_method").notNull(), // 'gps', 'network', 'imei_tracking', 'cell_tower'
  timestamp: timestamp("timestamp").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  children: many(children),
  schedules: many(schedules),
}));

export const childrenRelations = relations(children, ({ one, many }) => ({
  parent: one(users, {
    fields: [children.parentId],
    references: [users.id],
  }),
  devices: many(devices),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
  child: one(children, {
    fields: [devices.childId],
    references: [children.id],
  }),
  deviceSchedules: many(deviceSchedules),
  activityLogs: many(activityLogs),
  locationLogs: many(locationLogs),
}));

export const schedulesRelations = relations(schedules, ({ one, many }) => ({
  parent: one(users, {
    fields: [schedules.parentId],
    references: [users.id],
  }),
  deviceSchedules: many(deviceSchedules),
}));

export const deviceSchedulesRelations = relations(deviceSchedules, ({ one }) => ({
  device: one(devices, {
    fields: [deviceSchedules.deviceId],
    references: [devices.id],
  }),
  schedule: one(schedules, {
    fields: [deviceSchedules.scheduleId],
    references: [schedules.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  device: one(devices, {
    fields: [activityLogs.deviceId],
    references: [devices.id],
  }),
}));

export const locationLogsRelations = relations(locationLogs, ({ one }) => ({
  device: one(devices, {
    fields: [locationLogs.deviceId],
    references: [devices.id],
  }),
}));

// Insert schemas
export const insertChildSchema = createInsertSchema(children).omit({
  id: true,
  createdAt: true,
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  createdAt: true,
  lastSeen: true,
  screenTimeToday: true,
  consentStatus: true,
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({
  id: true,
  createdAt: true,
});

export const insertDeviceScheduleSchema = createInsertSchema(deviceSchedules).omit({
  id: true,
  createdAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true,
  timestamp: true,
});

export const insertLocationLogSchema = createInsertSchema(locationLogs).omit({
  id: true,
  timestamp: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Child = typeof children.$inferSelect;
export type InsertChild = z.infer<typeof insertChildSchema>;
export type Device = typeof devices.$inferSelect;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type DeviceSchedule = typeof deviceSchedules.$inferSelect;
export type InsertDeviceSchedule = z.infer<typeof insertDeviceScheduleSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type LocationLog = typeof locationLogs.$inferSelect;
export type InsertLocationLog = z.infer<typeof insertLocationLogSchema>;
