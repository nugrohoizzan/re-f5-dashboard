DO $$ BEGIN
 CREATE TYPE "public"."activity_status" AS ENUM('pending', 'completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."shift" AS ENUM('1', '2', '3');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."titipan_status" AS ENUM('pending', 'in_progress', 'completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."troubleshoot_status" AS ENUM('pending', 'in_progress', 'completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('admin', 'engineer');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"shift" "shift" NOT NULL,
	"engineer_id" integer,
	"description" text NOT NULL,
	"status" "activity_status" DEFAULT 'pending' NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" varchar(40) NOT NULL,
	"entity_id" integer NOT NULL,
	"field" varchar(60) NOT NULL,
	"old_value" text,
	"new_value" text,
	"changed_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "engineers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"display_name" varchar(120) NOT NULL,
	"email" varchar(200),
	"role" varchar(80),
	"username" varchar(80),
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "handover_task_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"action" varchar(60) NOT NULL,
	"notes" text,
	"performed_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "handover_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text,
	"ticket_reference" varchar(80),
	"source_date" date NOT NULL,
	"source_shift" "shift" NOT NULL,
	"created_by" integer,
	"assigned_engineer_id" integer,
	"status" "titipan_status" DEFAULT 'pending' NOT NULL,
	"due_date" date,
	"notes" text,
	"completion_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shift_schedule" (
	"id" serial PRIMARY KEY NOT NULL,
	"engineer_id" integer NOT NULL,
	"date" date NOT NULL,
	"shift_value" varchar(20) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shift_value_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"raw_value" varchar(20) NOT NULL,
	"maps_to_shift" "shift",
	"label" varchar(60) NOT NULL,
	"color_token" varchar(30) DEFAULT 'neutral' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shift_value_rules_raw_value_unique" UNIQUE("raw_value")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "troubleshooting" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"shift" "shift" NOT NULL,
	"engineer_id" integer,
	"title" varchar(200) NOT NULL,
	"description" text,
	"ticket_reference" varchar(80),
	"affected_vs" varchar(150),
	"affected_pool" varchar(150),
	"resolution" text,
	"status" "troubleshoot_status" DEFAULT 'pending' NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(200) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'engineer' NOT NULL,
	"engineer_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activities" ADD CONSTRAINT "activities_engineer_id_engineers_id_fk" FOREIGN KEY ("engineer_id") REFERENCES "public"."engineers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activities" ADD CONSTRAINT "activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "handover_task_history" ADD CONSTRAINT "handover_task_history_task_id_handover_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."handover_tasks"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "handover_task_history" ADD CONSTRAINT "handover_task_history_performed_by_users_id_fk" FOREIGN KEY ("performed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "handover_tasks" ADD CONSTRAINT "handover_tasks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "handover_tasks" ADD CONSTRAINT "handover_tasks_assigned_engineer_id_engineers_id_fk" FOREIGN KEY ("assigned_engineer_id") REFERENCES "public"."engineers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "shift_schedule" ADD CONSTRAINT "shift_schedule_engineer_id_engineers_id_fk" FOREIGN KEY ("engineer_id") REFERENCES "public"."engineers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "troubleshooting" ADD CONSTRAINT "troubleshooting_engineer_id_engineers_id_fk" FOREIGN KEY ("engineer_id") REFERENCES "public"."engineers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "troubleshooting" ADD CONSTRAINT "troubleshooting_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_engineer_id_engineers_id_fk" FOREIGN KEY ("engineer_id") REFERENCES "public"."engineers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activities_date_shift_idx" ON "activities" USING btree ("date","shift");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "handover_task_history_task_idx" ON "handover_task_history" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "handover_tasks_status_idx" ON "handover_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "handover_tasks_ticket_idx" ON "handover_tasks" USING btree ("ticket_reference");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "handover_tasks_source_idx" ON "handover_tasks" USING btree ("source_date","source_shift");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "shift_schedule_engineer_date_idx" ON "shift_schedule" USING btree ("engineer_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "shift_schedule_date_idx" ON "shift_schedule" USING btree ("date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "troubleshooting_date_shift_idx" ON "troubleshooting" USING btree ("date","shift");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "troubleshooting_ticket_idx" ON "troubleshooting" USING btree ("ticket_reference");