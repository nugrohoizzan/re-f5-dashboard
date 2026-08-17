CREATE TABLE IF NOT EXISTS "cli_commands" (
	"id" serial PRIMARY KEY NOT NULL,
	"command" text NOT NULL,
	"description" text,
	"category" varchar(60),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quick_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tool_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"category" varchar(60),
	"content" text,
	"account_username" varchar(200),
	"account_password_encrypted" text,
	"account_url" varchar(500),
	"file_url" text,
	"file_name" varchar(255),
	"file_type" varchar(120),
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tool_notes_title_idx" ON "tool_notes" USING btree ("title");