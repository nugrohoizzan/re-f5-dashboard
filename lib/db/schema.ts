import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  boolean,
  date,
  integer,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const userRoleEnum = pgEnum("user_role", ["admin", "team_leader", "engineer"]);

export const mopStatusEnum = pgEnum("mop_status", ["menunggu_review", "selesai_review"]);

export const shiftEnum = pgEnum("shift", ["1", "2", "3"]);

export const activityStatusEnum = pgEnum("activity_status", [
  "pending",
  "completed",
]);

export const troubleshootStatusEnum = pgEnum("troubleshoot_status", [
  "pending",
  "in_progress",
  "completed",
]);

export const titipanCategoryEnum = pgEnum("titipan_category", [
  "none",
  "support",
  "mop",
  "scm",
  "ncm",
  "ekse",
]);

export const titipanStatusEnum = pgEnum("titipan_status", [
  "pending",
  "in_progress",
  "completed",
]);

// ---------------------------------------------------------------------------
// Users (login identities) & Engineers (operational roster)
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("engineer"),
  engineerId: integer("engineer_id").references(() => engineers.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const engineers = pgTable("engineers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  email: varchar("email", { length: 200 }),
  role: varchar("role", { length: 80 }),
  username: varchar("username", { length: 80 }),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Shift schedule (the "Excel-like" grid) + configurable value->shift rules
// ---------------------------------------------------------------------------

// One row per engineer per date. shiftValue is a free-form string ("1", "2",
// "3", "OH", "CT", "OFF", "23", or any future custom value) so the grid never
// needs a schema change to support a new label.
export const shiftSchedule = pgTable(
  "shift_schedule",
  {
    id: serial("id").primaryKey(),
    engineerId: integer("engineer_id")
      .notNull()
      .references(() => engineers.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    shiftValue: varchar("shift_value", { length: 20 }).notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    engineerDateUnique: uniqueIndex("shift_schedule_engineer_date_idx").on(
      t.engineerId,
      t.date
    ),
    dateIdx: index("shift_schedule_date_idx").on(t.date),
  })
);

// Business rule: which raw shiftValue strings count as "working Shift 1/2/3",
// and how they should be styled. Configurable in Settings instead of
// hardcoded, per the spec's requirement that OH/CT meaning not be assumed.
export const shiftValueRules = pgTable(
  "shift_value_rules",
  {
    id: serial("id").primaryKey(),
    rawValue: varchar("raw_value", { length: 20 }).notNull().unique(),
    // If this value means the engineer is working a real shift, which one?
    // Null = does not map to any working shift (e.g. OFF, CT).
    mapsToShift: shiftEnum("maps_to_shift"),
    label: varchar("label", { length: 60 }).notNull(),
    colorToken: varchar("color_token", { length: 30 })
      .notNull()
      .default("neutral"), // neutral | off | oh | ct | shift1 | shift2 | shift3
    // Optional "HH:MM" clock times for display purposes only (e.g. "06:00").
    // Shift 3 / value "23" legitimately cross midnight (22:00-06:00,
    // 18:00-02:00), so these are plain strings, not a duration — the UI
    // just shows "startTime - endTime" and doesn't do date math with them.
    startTime: varchar("start_time", { length: 5 }),
    endTime: varchar("end_time", { length: 5 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  }
);

// ---------------------------------------------------------------------------
// Activities — shift-scoped operational tasks, done and closed within a shift
// ---------------------------------------------------------------------------

export const activities = pgTable(
  "activities",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    shift: shiftEnum("shift").notNull(),
    engineerId: integer("engineer_id").references(() => engineers.id, {
      onDelete: "set null",
    }),
    description: text("description").notNull(),
    status: activityStatusEnum("status").notNull().default("pending"),
    createdBy: integer("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    dateShiftIdx: index("activities_date_shift_idx").on(t.date, t.shift),
  })
);

// ---------------------------------------------------------------------------
// Troubleshooting — incidents handled during a shift
// ---------------------------------------------------------------------------

export const troubleshooting = pgTable(
  "troubleshooting",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    shift: shiftEnum("shift").notNull(),
    engineerId: integer("engineer_id").references(() => engineers.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    ticketReference: varchar("ticket_reference", { length: 80 }),
    affectedVs: varchar("affected_vs", { length: 150 }),
    affectedPool: varchar("affected_pool", { length: 150 }),
    resolution: text("resolution"),
    status: troubleshootStatusEnum("status").notNull().default("pending"),
    createdBy: integer("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    dateShiftIdx: index("troubleshooting_date_shift_idx").on(t.date, t.shift),
    ticketIdx: index("troubleshooting_ticket_idx").on(t.ticketReference),
  })
);

// ---------------------------------------------------------------------------
// Titipan / handover tasks — persistent, survive across shifts. One row per
// task for its whole lifecycle; source_date/source_shift are frozen at
// creation. History timeline lives in handoverTaskHistory (Phase 4).
// ---------------------------------------------------------------------------

export const handoverTasks = pgTable(
  "handover_tasks",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    ticketReference: varchar("ticket_reference", { length: 80 }),
    sourceDate: date("source_date", { mode: "string" }).notNull(),
    sourceShift: shiftEnum("source_shift").notNull(),
    category: titipanCategoryEnum("category").notNull().default("none"),
    createdBy: integer("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    assignedEngineerId: integer("assigned_engineer_id").references(
      () => engineers.id,
      { onDelete: "set null" }
    ),
    status: titipanStatusEnum("status").notNull().default("pending"),
    dueDate: date("due_date", { mode: "string" }),
    notes: text("notes"),
    completionNotes: text("completion_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    statusIdx: index("handover_tasks_status_idx").on(t.status),
    ticketIdx: index("handover_tasks_ticket_idx").on(t.ticketReference),
    sourceIdx: index("handover_tasks_source_idx").on(
      t.sourceDate,
      t.sourceShift
    ),
  })
);

export const handoverTaskHistory = pgTable(
  "handover_task_history",
  {
    id: serial("id").primaryKey(),
    taskId: integer("task_id")
      .notNull()
      .references(() => handoverTasks.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 60 }).notNull(), // created | status_changed | note_added | edited
    notes: text("notes"),
    performedBy: integer("performed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    taskIdx: index("handover_task_history_task_idx").on(t.taskId),
  })
);

// ---------------------------------------------------------------------------
// MOP (Metode Operasi Prosedur) — dokumen cara eksekusi di F5 yang diminta
// user, diunggah oleh engineer shift, lalu direview oleh Team Leader.
// ---------------------------------------------------------------------------

export const mops = pgTable(
  "mops",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    scrCode: varchar("scr_code", { length: 40 }), // cth. SCR26073173374
    requestedBy: varchar("requested_by", { length: 150 }), // user/klien yang minta
    description: text("description"),
    fileUrl: text("file_url").notNull(), // Vercel Blob URL
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileType: varchar("file_type", { length: 20 }).notNull(), // pdf | docx
    fileSize: integer("file_size").notNull().default(0), // bytes
    status: mopStatusEnum("status").notNull().default("menunggu_review"),
    uploadedBy: integer("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    reviewedBy: integer("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    scrIdx: index("mops_scr_idx").on(t.scrCode),
    titleIdx: index("mops_title_idx").on(t.title),
    statusIdx: index("mops_status_idx").on(t.status),
  })
);

// Catatan review di luar isi file (bukan coretan di dalam dokumen) — biasanya
// diisi Team Leader untuk memberi arahan/feedback ke engineer.
export const mopNotes = pgTable(
  "mop_notes",
  {
    id: serial("id").primaryKey(),
    mopId: integer("mop_id")
      .notNull()
      .references(() => mops.id, { onDelete: "cascade" }),
    note: text("note").notNull(),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    mopIdx: index("mop_notes_mop_idx").on(t.mopId),
  })
);

// Coretan/markup di atas dokumen (pena bebas, teks, bentuk) disimpan sebagai
// satu blob JSON per MOP — layer transparan yang digambar ulang di atas
// preview file setiap kali dibuka, non-destruktif terhadap file aslinya.
export const mopAnnotations = pgTable("mop_annotations", {
  id: serial("id").primaryKey(),
  mopId: integer("mop_id")
    .notNull()
    .references(() => mops.id, { onDelete: "cascade" })
    .unique(),
  data: text("data").notNull().default("[]"), // JSON array of strokes/shapes/text
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mopsRelations = relations(mops, ({ one, many }) => ({
  uploader: one(users, { fields: [mops.uploadedBy], references: [users.id] }),
  reviewer: one(users, { fields: [mops.reviewedBy], references: [users.id] }),
  notes: many(mopNotes),
}));

export const mopNotesRelations = relations(mopNotes, ({ one }) => ({
  mop: one(mops, { fields: [mopNotes.mopId], references: [mops.id] }),
}));

export type Mop = typeof mops.$inferSelect;
export type MopNote = typeof mopNotes.$inferSelect;
export type MopAnnotation = typeof mopAnnotations.$inferSelect;

// ---------------------------------------------------------------------------
// Audit log — accountability trail for status/field changes across entities
// ---------------------------------------------------------------------------

export const auditLog = pgTable(
  "audit_log",
  {
    id: serial("id").primaryKey(),
    entityType: varchar("entity_type", { length: 40 }).notNull(), // activity | troubleshooting | handover_task | schedule | engineer
    entityId: integer("entity_id").notNull(),
    field: varchar("field", { length: 60 }).notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    changedBy: integer("changed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    entityIdx: index("audit_log_entity_idx").on(t.entityType, t.entityId),
  })
);

// ---------------------------------------------------------------------------
// Tools & Platforms — Notes/Accounts (SOP, kredensial, catatan bebas dengan
// lampiran opsional), CLI Commands, dan Quick Links.
// ---------------------------------------------------------------------------

export const toolNotes = pgTable(
  "tool_notes",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    category: varchar("category", { length: 60 }), // label bebas: "SOP", "Akun", "Catatan", dst
    content: text("content"),
    // Kredensial akun (opsional) — password DIENKRIPSI sebelum disimpan,
    // tidak pernah disimpan/ditampilkan dalam bentuk teks biasa.
    accountUsername: varchar("account_username", { length: 200 }),
    accountPasswordEncrypted: text("account_password_encrypted"),
    accountUrl: varchar("account_url", { length: 500 }),
    // Lampiran opsional (PDF/DOCX/gambar), disimpan di Vercel Blob
    fileUrl: text("file_url"),
    fileName: varchar("file_name", { length: 255 }),
    fileType: varchar("file_type", { length: 120 }),
    createdByUserId: text("created_by_user_id"), // lihat CATATAN #1 di bawah
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    titleIdx: index("tool_notes_title_idx").on(t.title),
  })
);

export const cliCommands = pgTable("cli_commands", {
  id: serial("id").primaryKey(),
  command: text("command").notNull(),
  description: text("description"),
  category: varchar("category", { length: 60 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const quickLinks = pgTable("quick_links", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ToolNote = typeof toolNotes.$inferSelect;
export type CliCommand = typeof cliCommands.$inferSelect;
export type QuickLink = typeof quickLinks.$inferSelect;

// ---------------------------------------------------------------------------
// Calendar — activity di luar aktivitas harian/titipan/troubleshoot, cth.
// rencana switch over / switch back. Waktu mulai selalu pasti (timestamp),
// tapi waktu selesai punya 3 jenis:
//   - "undetermined": belum bisa ditentukan sama sekali, tetap dianggap
//     berjalan (nge-trace tiap hari di kalender) sampai diedit manual.
//   - "in_progress": lagi berjalan, muncul tombol "Tandai Selesai" untuk
//     langsung mengunci actualEndAt.
//   - "determined": sudah pasti sejak awal, plannedEndAt langsung diisi.
// actualEndAt adalah waktu selesai SEBENARNYA (diisi lewat tombol Selesai
// atau lewat edit manual) — dipakai untuk tahu sebuah event sudah kelar
// atau belum, terlepas dari endType apa.
// ---------------------------------------------------------------------------

export const calendarEventEndTypeEnum = pgEnum("calendar_event_end_type", [
  "undetermined",
  "in_progress",
  "determined",
]);

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endType: calendarEventEndTypeEnum("end_type").notNull().default("undetermined"),
    plannedEndAt: timestamp("planned_end_at", { withTimezone: true }),
    actualEndAt: timestamp("actual_end_at", { withTimezone: true }),
    createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    startIdx: index("calendar_events_start_idx").on(t.startAt),
  })
);

export type CalendarEvent = typeof calendarEvents.$inferSelect;

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const engineersRelations = relations(engineers, ({ many }) => ({
  scheduleEntries: many(shiftSchedule),
  activities: many(activities),
  troubleshootingItems: many(troubleshooting),
}));

export const usersRelations = relations(users, ({ one }) => ({
  engineer: one(engineers, {
    fields: [users.engineerId],
    references: [engineers.id],
  }),
}));

export const shiftScheduleRelations = relations(shiftSchedule, ({ one }) => ({
  engineer: one(engineers, {
    fields: [shiftSchedule.engineerId],
    references: [engineers.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  engineer: one(engineers, {
    fields: [activities.engineerId],
    references: [engineers.id],
  }),
}));

export const troubleshootingRelations = relations(
  troubleshooting,
  ({ one }) => ({
    engineer: one(engineers, {
      fields: [troubleshooting.engineerId],
      references: [engineers.id],
    }),
  })
);

export const handoverTasksRelations = relations(
  handoverTasks,
  ({ one, many }) => ({
    assignedEngineer: one(engineers, {
      fields: [handoverTasks.assignedEngineerId],
      references: [engineers.id],
    }),
    history: many(handoverTaskHistory),
  })
);

export const handoverTaskHistoryRelations = relations(
  handoverTaskHistory,
  ({ one }) => ({
    task: one(handoverTasks, {
      fields: [handoverTaskHistory.taskId],
      references: [handoverTasks.id],
    }),
  })
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Engineer = typeof engineers.$inferSelect;
export type NewEngineer = typeof engineers.$inferInsert;
export type User = typeof users.$inferSelect;
export type ShiftScheduleEntry = typeof shiftSchedule.$inferSelect;
export type ShiftValueRule = typeof shiftValueRules.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Troubleshoot = typeof troubleshooting.$inferSelect;
export type HandoverTask = typeof handoverTasks.$inferSelect;
export type HandoverTaskHistoryEntry = typeof handoverTaskHistory.$inferSelect;
