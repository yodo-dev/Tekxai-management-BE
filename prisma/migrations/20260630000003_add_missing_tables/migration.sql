-- milestones
CREATE TABLE IF NOT EXISTS "milestones" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_date" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "milestones_project_id_idx" ON "milestones"("project_id");

-- invites
CREATE TABLE IF NOT EXISTS "invites" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "team_id" TEXT,
    "department" TEXT,
    "designation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "invited_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "redeemed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "invites_token_key" ON "invites"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "invites_redeemed_by_id_key" ON "invites"("redeemed_by_id");
CREATE INDEX IF NOT EXISTS "invites_email_idx" ON "invites"("email");
CREATE INDEX IF NOT EXISTS "invites_token_idx" ON "invites"("token");
CREATE INDEX IF NOT EXISTS "invites_status_idx" ON "invites"("status");

-- leave_balances
CREATE TABLE IF NOT EXISTS "leave_balances" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "total_days" INTEGER NOT NULL DEFAULT 0,
    "used_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pending_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remaining_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "leave_balances_user_policy_year_key" ON "leave_balances"("user_id", "policy_id", "year");
CREATE INDEX IF NOT EXISTS "leave_balances_user_id_idx" ON "leave_balances"("user_id");
CREATE INDEX IF NOT EXISTS "leave_balances_policy_id_idx" ON "leave_balances"("policy_id");

-- job_descriptions
CREATE TABLE IF NOT EXISTS "job_descriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department_id" TEXT,
    "division_id" TEXT,
    "reporting_to_id" TEXT,
    "employment_type" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "responsibilities" TEXT,
    "qualifications" TEXT,
    "kpi_targets" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_descriptions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "job_descriptions_user_id_key" ON "job_descriptions"("user_id");
CREATE INDEX IF NOT EXISTS "job_descriptions_user_id_idx" ON "job_descriptions"("user_id");
CREATE INDEX IF NOT EXISTS "job_descriptions_department_id_idx" ON "job_descriptions"("department_id");

-- webhooks
CREATE TABLE IF NOT EXISTS "webhooks" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "events" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- webhook_deliveries
CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "webhook_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status_code" INTEGER,
    "response" TEXT,
    "delivered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- saved_reports
CREATE TABLE IF NOT EXISTS "saved_reports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id")
);

-- google_calendar_tokens
CREATE TABLE IF NOT EXISTS "google_calendar_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "expires_at" TIMESTAMP(3),
    "scope" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "google_calendar_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "google_calendar_tokens_user_id_key" ON "google_calendar_tokens"("user_id");

-- file_uploads
CREATE TABLE IF NOT EXISTS "file_uploads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "file_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL DEFAULT 0,
    "mime_type" TEXT NOT NULL,
    "bucket" TEXT NOT NULL DEFAULT 'tekxai-erp',
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "file_uploads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "file_uploads_file_key_key" ON "file_uploads"("file_key");
CREATE INDEX IF NOT EXISTS "file_uploads_user_id_idx" ON "file_uploads"("user_id");
CREATE INDEX IF NOT EXISTS "file_uploads_entity_idx" ON "file_uploads"("entity_type", "entity_id");

-- messages
CREATE TABLE IF NOT EXISTS "messages" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parent_id" TEXT,
    "file_key" TEXT,
    "file_url" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "mime_type" TEXT,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "messages_channel_id_idx" ON "messages"("channel_id");
CREATE INDEX IF NOT EXISTS "messages_user_id_idx" ON "messages"("user_id");
CREATE INDEX IF NOT EXISTS "messages_created_at_idx" ON "messages"("created_at");

-- message_reactions
CREATE TABLE IF NOT EXISTS "message_reactions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "message_reactions_msg_user_emoji_key" ON "message_reactions"("message_id", "user_id", "emoji");

-- linkedin_leads
CREATE TABLE IF NOT EXISTS "linkedin_leads" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "full_name" TEXT NOT NULL,
    "job_title" TEXT,
    "linkedin_url" TEXT,
    "bio" TEXT,
    "client_name" TEXT,
    "invite_note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Connected',
    "pipeline_stage" TEXT NOT NULL DEFAULT 'NEW',
    "contract_amount" DOUBLE PRECISION,
    "is_hot" BOOLEAN NOT NULL DEFAULT false,
    "lose_reasons" TEXT[],
    "lose_notes" TEXT,
    "email" TEXT,
    "email_1_status" TEXT NOT NULL DEFAULT 'pending',
    "email_2" TEXT,
    "email_2_status" TEXT NOT NULL DEFAULT 'pending',
    "email_3" TEXT,
    "email_3_status" TEXT NOT NULL DEFAULT 'pending',
    "phone_1" TEXT,
    "phone_1_status" TEXT NOT NULL DEFAULT 'pending',
    "phone_2" TEXT,
    "phone_2_status" TEXT NOT NULL DEFAULT 'pending',
    "phone_3" TEXT,
    "phone_3_status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "linkedin_leads_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "linkedin_leads_user_id_idx" ON "linkedin_leads"("user_id");
CREATE INDEX IF NOT EXISTS "linkedin_leads_status_idx" ON "linkedin_leads"("status");
CREATE INDEX IF NOT EXISTS "linkedin_leads_date_idx" ON "linkedin_leads"("date");

-- linkedin_activity
CREATE TABLE IF NOT EXISTS "linkedin_activity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activity_type" TEXT NOT NULL,
    "topic" TEXT,
    "summary" TEXT,
    "notes" TEXT,
    "post_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "linkedin_activity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "linkedin_activity_user_id_idx" ON "linkedin_activity"("user_id");
CREATE INDEX IF NOT EXISTS "linkedin_activity_date_idx" ON "linkedin_activity"("date");

-- lead_activities
CREATE TABLE IF NOT EXISTS "lead_activities" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "lead_source" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "lead_activities_lead_id_idx" ON "lead_activities"("lead_id");
CREATE INDEX IF NOT EXISTS "lead_activities_author_id_idx" ON "lead_activities"("author_id");

-- marketing_targets
CREATE TABLE IF NOT EXISTS "marketing_targets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "team_type" TEXT,
    "upwork_daily" INTEGER NOT NULL DEFAULT 10,
    "email_daily" INTEGER NOT NULL DEFAULT 50,
    "linkedin_daily" INTEGER NOT NULL DEFAULT 20,
    "linkedin_connections_daily" INTEGER NOT NULL DEFAULT 15,
    "linkedin_posts_daily" INTEGER NOT NULL DEFAULT 1,
    "linkedin_interactions_daily" INTEGER NOT NULL DEFAULT 5,
    "monthly_sales_target" DOUBLE PRECISION NOT NULL DEFAULT 40000,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "marketing_targets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "marketing_targets_user_team_key" ON "marketing_targets"("user_id", "team_type");
CREATE INDEX IF NOT EXISTS "marketing_targets_user_id_idx" ON "marketing_targets"("user_id");

-- expense_accounts
CREATE TABLE IF NOT EXISTS "expense_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "opening_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expense_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "expense_accounts_user_id_key" ON "expense_accounts"("user_id");

-- expense_categories
CREATE TABLE IF NOT EXISTS "expense_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "expense_categories_name_key" ON "expense_categories"("name");

-- expense_transactions
CREATE TABLE IF NOT EXISTS "expense_transactions" (
    "id" TEXT NOT NULL,
    "expense_account_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "ce_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tekxai_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category_id" TEXT,
    "paid_to" TEXT,
    "notes" TEXT,
    "attachment_url" TEXT,
    "receipt_url" TEXT,
    "receipt_key" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expense_transactions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "expense_transactions_account_id_idx" ON "expense_transactions"("expense_account_id");
CREATE INDEX IF NOT EXISTS "expense_transactions_user_id_idx" ON "expense_transactions"("user_id");
CREATE INDEX IF NOT EXISTS "expense_transactions_date_idx" ON "expense_transactions"("date");

-- financial_reports
CREATE TABLE IF NOT EXISTS "financial_reports" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "period_from" TIMESTAMP(3) NOT NULL,
    "period_to" TIMESTAMP(3) NOT NULL,
    "uploaded_file_name" TEXT,
    "raw_transactions" JSONB,
    "upwork_totals" JSONB,
    "manual_adjustments" JSONB,
    "salary_snapshot" DECIMAL(12,2),
    "expense_snapshot" DECIMAL(12,2),
    "final_result" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "financial_reports_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "financial_reports_created_by_idx" ON "financial_reports"("created_by");
CREATE INDEX IF NOT EXISTS "financial_reports_period_from_idx" ON "financial_reports"("period_from");

-- task_sub_items
CREATE TABLE IF NOT EXISTS "task_sub_items" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_sub_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "task_sub_items_task_id_idx" ON "task_sub_items"("task_id");

-- task_time_logs
CREATE TABLE IF NOT EXISTS "task_time_logs" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "seconds" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_time_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "task_time_logs_task_id_idx" ON "task_time_logs"("task_id");
CREATE INDEX IF NOT EXISTS "task_time_logs_user_id_idx" ON "task_time_logs"("user_id");

-- payroll_runs
CREATE TABLE IF NOT EXISTS "payroll_runs" (
    "id" TEXT NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "total_gross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_net" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "processed_by" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payroll_runs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "payroll_runs_month_year_key" ON "payroll_runs"("period_month", "period_year");
CREATE INDEX IF NOT EXISTS "payroll_runs_status_idx" ON "payroll_runs"("status");

-- payroll_entries
CREATE TABLE IF NOT EXISTS "payroll_entries" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "base_salary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "working_days" INTEGER NOT NULL DEFAULT 0,
    "present_days" INTEGER NOT NULL DEFAULT 0,
    "overtime_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overtime_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bonus_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gross_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "net_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payslip_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payroll_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "payroll_entries_run_id_idx" ON "payroll_entries"("run_id");
CREATE INDEX IF NOT EXISTS "payroll_entries_user_id_idx" ON "payroll_entries"("user_id");

-- download_events
CREATE TABLE IF NOT EXISTS "download_events" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "version" TEXT,
    "user_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "download_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "download_events_platform_idx" ON "download_events"("platform");
CREATE INDEX IF NOT EXISTS "download_events_user_id_idx" ON "download_events"("user_id");
CREATE INDEX IF NOT EXISTS "download_events_created_at_idx" ON "download_events"("created_at");

-- app_usage_logs
CREATE TABLE IF NOT EXISTS "app_usage_logs" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "app_name" TEXT NOT NULL,
    "window_title" TEXT,
    "url" TEXT,
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "app_usage_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "app_usage_logs_user_id_idx" ON "app_usage_logs"("user_id");
CREATE INDEX IF NOT EXISTS "app_usage_logs_session_id_idx" ON "app_usage_logs"("session_id");
CREATE INDEX IF NOT EXISTS "app_usage_logs_captured_at_idx" ON "app_usage_logs"("captured_at");

-- Foreign keys
ALTER TABLE "milestones" DROP CONSTRAINT IF EXISTS "milestones_project_id_fkey";
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;

ALTER TABLE "invites" DROP CONSTRAINT IF EXISTS "invites_role_id_fkey";
ALTER TABLE "invites" ADD CONSTRAINT "invites_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT;

ALTER TABLE "invites" DROP CONSTRAINT IF EXISTS "invites_team_id_fkey";
ALTER TABLE "invites" ADD CONSTRAINT "invites_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL;

ALTER TABLE "invites" DROP CONSTRAINT IF EXISTS "invites_invited_by_fkey";
ALTER TABLE "invites" ADD CONSTRAINT "invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "invites" DROP CONSTRAINT IF EXISTS "invites_redeemed_by_id_fkey";
ALTER TABLE "invites" ADD CONSTRAINT "invites_redeemed_by_id_fkey" FOREIGN KEY ("redeemed_by_id") REFERENCES "users"("id");

ALTER TABLE "leave_balances" DROP CONSTRAINT IF EXISTS "leave_balances_user_id_fkey";
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "leave_balances" DROP CONSTRAINT IF EXISTS "leave_balances_policy_id_fkey";
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "time_off_policies"("id") ON DELETE CASCADE;

ALTER TABLE "job_descriptions" DROP CONSTRAINT IF EXISTS "job_descriptions_user_id_fkey";
ALTER TABLE "job_descriptions" ADD CONSTRAINT "job_descriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "webhooks" DROP CONSTRAINT IF EXISTS "webhooks_created_by_fkey";
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");

ALTER TABLE "webhook_deliveries" DROP CONSTRAINT IF EXISTS "webhook_deliveries_webhook_id_fkey";
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_fkey" FOREIGN KEY ("webhook_id") REFERENCES "webhooks"("id") ON DELETE CASCADE;

ALTER TABLE "saved_reports" DROP CONSTRAINT IF EXISTS "saved_reports_created_by_fkey";
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");

ALTER TABLE "google_calendar_tokens" DROP CONSTRAINT IF EXISTS "google_calendar_tokens_user_id_fkey";
ALTER TABLE "google_calendar_tokens" ADD CONSTRAINT "google_calendar_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "file_uploads" DROP CONSTRAINT IF EXISTS "file_uploads_user_id_fkey";
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_channel_id_fkey";
ALTER TABLE "messages" ADD CONSTRAINT "messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE;

ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_user_id_fkey";
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_parent_id_fkey";
ALTER TABLE "messages" ADD CONSTRAINT "messages_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "messages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "message_reactions" DROP CONSTRAINT IF EXISTS "message_reactions_message_id_fkey";
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE;

ALTER TABLE "linkedin_leads" DROP CONSTRAINT IF EXISTS "linkedin_leads_user_id_fkey";
ALTER TABLE "linkedin_leads" ADD CONSTRAINT "linkedin_leads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "linkedin_activity" DROP CONSTRAINT IF EXISTS "linkedin_activity_user_id_fkey";
ALTER TABLE "linkedin_activity" ADD CONSTRAINT "linkedin_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "marketing_targets" DROP CONSTRAINT IF EXISTS "marketing_targets_user_id_fkey";
ALTER TABLE "marketing_targets" ADD CONSTRAINT "marketing_targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "expense_accounts" DROP CONSTRAINT IF EXISTS "expense_accounts_user_id_fkey";
ALTER TABLE "expense_accounts" ADD CONSTRAINT "expense_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "expense_transactions" DROP CONSTRAINT IF EXISTS "expense_transactions_account_id_fkey";
ALTER TABLE "expense_transactions" ADD CONSTRAINT "expense_transactions_account_id_fkey" FOREIGN KEY ("expense_account_id") REFERENCES "expense_accounts"("id") ON DELETE CASCADE;

ALTER TABLE "expense_transactions" DROP CONSTRAINT IF EXISTS "expense_transactions_user_id_fkey";
ALTER TABLE "expense_transactions" ADD CONSTRAINT "expense_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");

ALTER TABLE "expense_transactions" DROP CONSTRAINT IF EXISTS "expense_transactions_category_id_fkey";
ALTER TABLE "expense_transactions" ADD CONSTRAINT "expense_transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id");

ALTER TABLE "expense_transactions" DROP CONSTRAINT IF EXISTS "expense_transactions_created_by_fkey";
ALTER TABLE "expense_transactions" ADD CONSTRAINT "expense_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");

ALTER TABLE "financial_reports" DROP CONSTRAINT IF EXISTS "financial_reports_created_by_fkey";
ALTER TABLE "financial_reports" ADD CONSTRAINT "financial_reports_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");

ALTER TABLE "task_sub_items" DROP CONSTRAINT IF EXISTS "task_sub_items_task_id_fkey";
ALTER TABLE "task_sub_items" ADD CONSTRAINT "task_sub_items_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE;

ALTER TABLE "task_sub_items" DROP CONSTRAINT IF EXISTS "task_sub_items_created_by_fkey";
ALTER TABLE "task_sub_items" ADD CONSTRAINT "task_sub_items_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id");

ALTER TABLE "task_time_logs" DROP CONSTRAINT IF EXISTS "task_time_logs_task_id_fkey";
ALTER TABLE "task_time_logs" ADD CONSTRAINT "task_time_logs_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE;

ALTER TABLE "task_time_logs" DROP CONSTRAINT IF EXISTS "task_time_logs_user_id_fkey";
ALTER TABLE "task_time_logs" ADD CONSTRAINT "task_time_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");

ALTER TABLE "payroll_runs" DROP CONSTRAINT IF EXISTS "payroll_runs_processed_by_fkey";
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users"("id");

ALTER TABLE "payroll_entries" DROP CONSTRAINT IF EXISTS "payroll_entries_run_id_fkey";
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "payroll_runs"("id") ON DELETE CASCADE;

ALTER TABLE "payroll_entries" DROP CONSTRAINT IF EXISTS "payroll_entries_user_id_fkey";
ALTER TABLE "payroll_entries" ADD CONSTRAINT "payroll_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");

ALTER TABLE "download_events" DROP CONSTRAINT IF EXISTS "download_events_user_id_fkey";
ALTER TABLE "download_events" ADD CONSTRAINT "download_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL;

ALTER TABLE "app_usage_logs" DROP CONSTRAINT IF EXISTS "app_usage_logs_user_id_fkey";
ALTER TABLE "app_usage_logs" ADD CONSTRAINT "app_usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");

ALTER TABLE "app_usage_logs" DROP CONSTRAINT IF EXISTS "app_usage_logs_session_id_fkey";
ALTER TABLE "app_usage_logs" ADD CONSTRAINT "app_usage_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "screenshot_sessions"("id");
