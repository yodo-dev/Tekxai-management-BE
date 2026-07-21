-- Project Management overhaul — replace the external Excel tracking sheet.
-- Additive-only: no existing column altered or dropped.

-- milestones: full Milestone Management (previously title/description/
-- due_date/completed/blocked only).
ALTER TABLE "milestones" ADD COLUMN "sequence" INTEGER;
ALTER TABLE "milestones" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "milestones" ADD COLUMN "estimated_start" TIMESTAMP(3);
ALTER TABLE "milestones" ADD COLUMN "estimated_end" TIMESTAMP(3);
ALTER TABLE "milestones" ADD COLUMN "completed_date" TIMESTAMP(3);
ALTER TABLE "milestones" ADD COLUMN "progress_percent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "milestones" ADD COLUMN "remarks" TEXT;
ALTER TABLE "milestones" ADD COLUMN "archived_at" TIMESTAMP(3);
ALTER TABLE "milestones" ADD COLUMN "depends_on_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- milestone_members: assigned members (many-to-many, distinct from project_members).
CREATE TABLE "milestone_members" (
  "id"           TEXT NOT NULL,
  "milestone_id" TEXT NOT NULL,
  "user_id"      TEXT NOT NULL,
  "assigned_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "milestone_members_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "milestone_members_milestone_id_user_id_key" ON "milestone_members"("milestone_id", "user_id");
CREATE INDEX "milestone_members_milestone_id_idx" ON "milestone_members"("milestone_id");
CREATE INDEX "milestone_members_user_id_idx" ON "milestone_members"("user_id");

ALTER TABLE "milestone_members" ADD CONSTRAINT "milestone_members_milestone_id_fkey"
  FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "milestone_members" ADD CONSTRAINT "milestone_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- devops_access_tracking: Project Access — OpenAI/Stripe/Azure, same
-- vocabulary as the existing git/server/domain/smtp/aws access fields.
ALTER TABLE "devops_access_tracking" ADD COLUMN "openai_access_status" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE';
ALTER TABLE "devops_access_tracking" ADD COLUMN "stripe_access_status" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE';
ALTER TABLE "devops_access_tracking" ADD COLUMN "azure_access_status" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE';

-- client_weekly_updates: optional attachment/link for Communication History.
ALTER TABLE "client_weekly_updates" ADD COLUMN "attachment_url" TEXT;
