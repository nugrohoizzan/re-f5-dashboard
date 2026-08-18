import { z } from "zod";

export const shiftSchema = z.enum(["1", "2", "3"]);

export const engineerSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  displayName: z.string().min(1, "Display name is required").max(120),
  email: z.string().email().optional().or(z.literal("")),
  role: z.string().max(80).optional().or(z.literal("")),
  username: z.string().max(80).optional().or(z.literal("")),
  active: z.boolean().default(true),
});

export const activityInputSchema = z.object({
  description: z.string().min(1, "Description cannot be empty").max(500),
  status: z.enum(["pending", "completed"]),
  engineerId: z.number().int().nullable().optional(),
});

export const activitiesBatchSchema = z.object({
  date: z.string().min(1, "Date is required"),
  shift: shiftSchema,
  items: z.array(activityInputSchema).min(1, "Add at least one activity"),
});

export const troubleshootSchema = z.object({
  date: z.string().min(1, "Date is required"),
  shift: shiftSchema,
  engineerId: z.number().int().nullable().optional(),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(4000).optional().or(z.literal("")),
  ticketReference: z.string().max(80).optional().or(z.literal("")),
  affectedVs: z.string().max(150).optional().or(z.literal("")),
  affectedPool: z.string().max(150).optional().or(z.literal("")),
  resolution: z.string().max(4000).optional().or(z.literal("")),
  status: z.enum(["pending", "in_progress", "completed"]),
});

export const titipanCategorySchema = z.enum(["none", "support", "mop", "scm", "ncm", "ekse"]);

export const titipanInputSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  category: titipanCategorySchema.default("none"),
  ticketReference: z.string().max(80).optional().or(z.literal("")),
  description: z.string().max(4000).optional().or(z.literal("")),
  dueDate: z.string().optional().or(z.literal("")),
  status: z.enum(["pending", "in_progress", "completed"]),
  assignedEngineerId: z.number().int().nullable().optional(),
});

export const titipanBatchSchema = z.object({
  date: z.string().min(1, "Date is required"),
  shift: shiftSchema,
  items: z.array(titipanInputSchema).min(1, "Add at least one item"),
});

export const scheduleCellSchema = z.object({
  engineerId: z.number().int(),
  date: z.string().min(1),
  shiftValue: z.string().max(20),
});

export const mopMetaSchema = z.object({
  title: z.string().min(1, "Judul wajib diisi").max(200),
  scrCode: z.string().max(40).optional().or(z.literal("")),
  requestedBy: z.string().max(150).optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
});

export const mopNoteSchema = z.object({
  mopId: z.number().int(),
  note: z.string().min(1, "Catatan tidak boleh kosong").max(2000),
});
