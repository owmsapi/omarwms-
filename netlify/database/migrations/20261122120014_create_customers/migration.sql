CREATE TABLE "customers" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "customers_user_phone_idx" ON "customers" ("user_id","phone");