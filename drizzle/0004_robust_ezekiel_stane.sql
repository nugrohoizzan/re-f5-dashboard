DO $$ BEGIN
 CREATE TYPE "public"."titipan_category" AS ENUM('none', 'support', 'mop', 'scm', 'ncm', 'ekse');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "handover_tasks" ADD COLUMN "category" "titipan_category" DEFAULT 'none' NOT NULL;