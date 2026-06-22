-- ============================================================
-- PHASES 3-12: Screenshot Monitoring, File Storage, Email Logs,
-- Onboarding, Contracts, Policies, Documents, CRM, Communication
-- ============================================================

-- Phase 3: Screenshot Monitoring
CREATE TABLE IF NOT EXISTS "screenshot_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "agent_version" TEXT,
    "os_platform" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "screenshot_sessions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "screenshot_sessions_user_id_idx" ON "screenshot_sessions"("user_id");

CREATE TABLE IF NOT EXISTS "screenshots" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "file_url" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "monitor_index" INTEGER NOT NULL DEFAULT 0,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "screenshots_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "screenshots_user_id_idx" ON "screenshots"("user_id");
CREATE INDEX IF NOT EXISTS "screenshots_session_id_idx" ON "screenshots"("session_id");
CREATE INDEX IF NOT EXISTS "screenshots_captured_at_idx" ON "screenshots"("captured_at");

CREATE TABLE IF NOT EXISTS "productivity_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "active_seconds" INTEGER NOT NULL DEFAULT 0,
    "idle_seconds" INTEGER NOT NULL DEFAULT 0,
    "mouse_events" INTEGER NOT NULL DEFAULT 0,
    "keyboard_events" INTEGER NOT NULL DEFAULT 0,
    "productivity_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "productivity_sessions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "productivity_sessions_user_date_key" ON "productivity_sessions"("user_id", "date");
CREATE INDEX IF NOT EXISTS "productivity_sessions_user_id_idx" ON "productivity_sessions"("user_id");

-- Phase 4: File Storage
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

-- Phase 5: Email Logs
CREATE TABLE IF NOT EXISTS "email_logs" (
    "id" TEXT NOT NULL,
    "to_email" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "error" TEXT,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "email_logs_to_email_idx" ON "email_logs"("to_email");
CREATE INDEX IF NOT EXISTS "email_logs_sent_at_idx" ON "email_logs"("sent_at");

-- Phase 6: Onboarding / Hiring
CREATE TABLE IF NOT EXISTS "candidates" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "position" TEXT,
    "department_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "invited_by" TEXT,
    "invite_token" TEXT,
    "invite_expires_at" TIMESTAMP(3),
    "offer_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "candidates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "candidates_email_key" ON "candidates"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "candidates_invite_token_key" ON "candidates"("invite_token");

CREATE TABLE IF NOT EXISTS "offers" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "department_id" TEXT,
    "salary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3),
    "employment_type" TEXT NOT NULL DEFAULT 'FULL_TIME',
    "letter_content" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sent_at" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "offers_candidate_id_idx" ON "offers"("candidate_id");

CREATE TABLE IF NOT EXISTS "onboarding_tasks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "due_date" TIMESTAMP(3),
    "assigned_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "onboarding_tasks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "onboarding_tasks_user_id_idx" ON "onboarding_tasks"("user_id");

-- Phase 7: Contracts
CREATE TABLE IF NOT EXISTS "contract_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EMPLOYMENT',
    "content" TEXT NOT NULL,
    "placeholders" JSONB NOT NULL DEFAULT '[]',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "contracts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template_id" TEXT,
    "type" TEXT NOT NULL DEFAULT 'EMPLOYMENT',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "file_key" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "signed_at" TIMESTAMP(3),
    "signature_data" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "contracts_user_id_idx" ON "contracts"("user_id");

-- Phase 8: Company Policies
CREATE TABLE IF NOT EXISTS "company_policies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "content" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(3),
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "company_policies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "policy_acknowledgements" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "acknowledged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    CONSTRAINT "policy_acknowledgements_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "policy_ack_user_policy_key" ON "policy_acknowledgements"("user_id", "policy_id");
CREATE INDEX IF NOT EXISTS "policy_ack_user_id_idx" ON "policy_acknowledgements"("user_id");

-- Phase 10: Client CRM
CREATE TABLE IF NOT EXISTS "client_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "invite_token" TEXT,
    "portal_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "client_accounts_invite_token_key" ON "client_accounts"("invite_token");

CREATE TABLE IF NOT EXISTS "client_project_access" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "access_level" TEXT NOT NULL DEFAULT 'VIEWER',
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "client_project_access_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "client_project_access_key" ON "client_project_access"("client_id", "project_id");

-- Phase 11-12: Project Discussions + Internal Chat
CREATE TABLE IF NOT EXISTS "project_discussions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "project_discussions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "project_discussions_project_id_idx" ON "project_discussions"("project_id");

CREATE TABLE IF NOT EXISTS "channels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'PUBLIC',
    "entity_type" TEXT,
    "entity_id" TEXT,
    "created_by" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "channel_members" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_read_at" TIMESTAMP(3),
    CONSTRAINT "channel_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "channel_members_channel_user_key" ON "channel_members"("channel_id", "user_id");

CREATE TABLE IF NOT EXISTS "messages" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parent_id" TEXT,
    "file_key" TEXT,
    "is_edited" BOOLEAN NOT NULL DEFAULT false,
    "edited_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "messages_channel_id_idx" ON "messages"("channel_id");
CREATE INDEX IF NOT EXISTS "messages_user_id_idx" ON "messages"("user_id");
CREATE INDEX IF NOT EXISTS "messages_created_at_idx" ON "messages"("created_at");

CREATE TABLE IF NOT EXISTS "message_reactions" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "message_reactions_msg_user_emoji_key" ON "message_reactions"("message_id", "user_id", "emoji");

-- Foreign keys
ALTER TABLE "screenshot_sessions" DROP CONSTRAINT IF EXISTS "screenshot_sessions_user_id_fkey";
ALTER TABLE "screenshot_sessions" ADD CONSTRAINT "screenshot_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "screenshots" DROP CONSTRAINT IF EXISTS "screenshots_session_id_fkey";
ALTER TABLE "screenshots" ADD CONSTRAINT "screenshots_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "screenshot_sessions"("id") ON DELETE CASCADE;

ALTER TABLE "screenshots" DROP CONSTRAINT IF EXISTS "screenshots_user_id_fkey";
ALTER TABLE "screenshots" ADD CONSTRAINT "screenshots_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "productivity_sessions" DROP CONSTRAINT IF EXISTS "productivity_sessions_user_id_fkey";
ALTER TABLE "productivity_sessions" ADD CONSTRAINT "productivity_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "file_uploads" DROP CONSTRAINT IF EXISTS "file_uploads_user_id_fkey";
ALTER TABLE "file_uploads" ADD CONSTRAINT "file_uploads_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "offers" DROP CONSTRAINT IF EXISTS "offers_candidate_id_fkey";
ALTER TABLE "offers" ADD CONSTRAINT "offers_candidate_id_fkey"
    FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id") ON DELETE CASCADE;

ALTER TABLE "onboarding_tasks" DROP CONSTRAINT IF EXISTS "onboarding_tasks_user_id_fkey";
ALTER TABLE "onboarding_tasks" ADD CONSTRAINT "onboarding_tasks_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_user_id_fkey";
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "policy_acknowledgements" DROP CONSTRAINT IF EXISTS "policy_ack_user_id_fkey";
ALTER TABLE "policy_acknowledgements" ADD CONSTRAINT "policy_ack_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "policy_acknowledgements" DROP CONSTRAINT IF EXISTS "policy_ack_policy_id_fkey";
ALTER TABLE "policy_acknowledgements" ADD CONSTRAINT "policy_ack_policy_id_fkey"
    FOREIGN KEY ("policy_id") REFERENCES "company_policies"("id") ON DELETE CASCADE;

ALTER TABLE "messages" DROP CONSTRAINT IF EXISTS "messages_channel_id_fkey";
ALTER TABLE "messages" ADD CONSTRAINT "messages_channel_id_fkey"
    FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE;

ALTER TABLE "channel_members" DROP CONSTRAINT IF EXISTS "channel_members_channel_id_fkey";
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_channel_id_fkey"
    FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE CASCADE;

ALTER TABLE "channel_members" DROP CONSTRAINT IF EXISTS "channel_members_user_id_fkey";
ALTER TABLE "channel_members" ADD CONSTRAINT "channel_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

ALTER TABLE "message_reactions" DROP CONSTRAINT IF EXISTS "message_reactions_message_id_fkey";
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_fkey"
    FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE CASCADE;

ALTER TABLE "project_discussions" DROP CONSTRAINT IF EXISTS "project_discussions_project_id_fkey";
ALTER TABLE "project_discussions" ADD CONSTRAINT "project_discussions_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;

ALTER TABLE "client_project_access" DROP CONSTRAINT IF EXISTS "client_project_access_client_id_fkey";
ALTER TABLE "client_project_access" ADD CONSTRAINT "client_project_access_client_id_fkey"
    FOREIGN KEY ("client_id") REFERENCES "client_accounts"("id") ON DELETE CASCADE;

-- Seed default channels
INSERT INTO "channels" ("id","name","description","type","created_by") VALUES
  ('chan_general_001','general','Company-wide announcements and general chat','PUBLIC',NULL),
  ('chan_dev_001','development','Engineering team discussions','PUBLIC',NULL),
  ('chan_design_001','design','Design team discussions','PUBLIC',NULL),
  ('chan_marketing_001','marketing','Marketing team discussions','PUBLIC',NULL),
  ('chan_hr_001','hr','HR announcements','PUBLIC',NULL)
ON CONFLICT DO NOTHING;
