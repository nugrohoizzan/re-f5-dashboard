DO $$ BEGIN
 CREATE TYPE "public"."mop_status" AS ENUM('menunggu_review', 'selesai_review');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TYPE "user_role" ADD VALUE 'team_leader';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mop_annotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"mop_id" integer NOT NULL,
	"data" text DEFAULT '[]' NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mop_annotations_mop_id_unique" UNIQUE("mop_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mop_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"mop_id" integer NOT NULL,
	"note" text NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mops" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"scr_code" varchar(40),
	"requested_by" varchar(150),
	"description" text,
	"file_url" text NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_type" varchar(20) NOT NULL,
	"file_size" integer DEFAULT 0 NOT NULL,
	"status" "mop_status" DEFAULT 'menunggu_review' NOT NULL,
	"uploaded_by" integer,
	"reviewed_by" integer,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mop_annotations" ADD CONSTRAINT "mop_annotations_mop_id_mops_id_fk" FOREIGN KEY ("mop_id") REFERENCES "public"."mops"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mop_annotations" ADD CONSTRAINT "mop_annotations_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mop_notes" ADD CONSTRAINT "mop_notes_mop_id_mops_id_fk" FOREIGN KEY ("mop_id") REFERENCES "public"."mops"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mop_notes" ADD CONSTRAINT "mop_notes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mops" ADD CONSTRAINT "mops_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mops" ADD CONSTRAINT "mops_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mop_notes_mop_idx" ON "mop_notes" USING btree ("mop_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mops_scr_idx" ON "mops" USING btree ("scr_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mops_title_idx" ON "mops" USING btree ("title");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mops_status_idx" ON "mops" USING btree ("status");