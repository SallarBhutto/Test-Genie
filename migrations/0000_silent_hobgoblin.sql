CREATE TABLE "components" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"module_id" integer NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "defects" (
	"id" serial PRIMARY KEY NOT NULL,
	"defect_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"test_case_id" integer,
	"project_id" integer NOT NULL,
	"reported_by" integer NOT NULL,
	"assigned_to" integer,
	"azure_work_item_id" integer,
	"azure_work_item_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "defects_defect_id_unique" UNIQUE("defect_id")
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"project_id" integer NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"team_name" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "test_cases" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_case_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"preconditions" text,
	"steps" json DEFAULT '[]'::json NOT NULL,
	"expected_result" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"project_id" integer,
	"module_id" integer,
	"component_id" integer,
	"assigned_to" integer,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "test_cases_test_case_id_unique" UNIQUE("test_case_id")
);
--> statement-breakpoint
CREATE TABLE "test_run_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_run_id" integer NOT NULL,
	"test_case_id" integer NOT NULL,
	"status" text NOT NULL,
	"executed_by" integer,
	"notes" text,
	"executed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'not_started' NOT NULL,
	"project_id" integer NOT NULL,
	"created_by" integer NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_suite_test_cases" (
	"test_suite_id" integer NOT NULL,
	"test_case_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_suites" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"project_id" integer NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"role" text DEFAULT 'tester' NOT NULL,
	"avatar" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_email_verified" boolean DEFAULT false NOT NULL,
	"email_verification_token" text,
	"email_verification_expires" timestamp,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "components" ADD CONSTRAINT "components_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defects" ADD CONSTRAINT "defects_test_case_id_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defects" ADD CONSTRAINT "defects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defects" ADD CONSTRAINT "defects_reported_by_users_id_fk" FOREIGN KEY ("reported_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "defects" ADD CONSTRAINT "defects_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "modules" ADD CONSTRAINT "modules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_module_id_modules_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_component_id_components_id_fk" FOREIGN KEY ("component_id") REFERENCES "public"."components"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run_results" ADD CONSTRAINT "test_run_results_test_run_id_test_runs_id_fk" FOREIGN KEY ("test_run_id") REFERENCES "public"."test_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run_results" ADD CONSTRAINT "test_run_results_test_case_id_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_run_results" ADD CONSTRAINT "test_run_results_executed_by_users_id_fk" FOREIGN KEY ("executed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_suite_test_cases" ADD CONSTRAINT "test_suite_test_cases_test_suite_id_test_suites_id_fk" FOREIGN KEY ("test_suite_id") REFERENCES "public"."test_suites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_suite_test_cases" ADD CONSTRAINT "test_suite_test_cases_test_case_id_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."test_cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_suites" ADD CONSTRAINT "test_suites_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_suites" ADD CONSTRAINT "test_suites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;