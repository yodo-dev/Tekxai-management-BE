-- Ticketing System Architecture (Tekxai-Operations-OS/09-Ticketing-System-Architecture.md)
-- adds the schema pieces needed for category -> department routing. Both columns
-- are nullable and additive only: existing tickets (which have neither) remain
-- valid, and no routing logic is wired up by this migration.
ALTER TABLE "support_tickets" ADD COLUMN "category" TEXT;
ALTER TABLE "support_tickets" ADD COLUMN "department_id" TEXT;

CREATE INDEX "support_tickets_department_id_idx" ON "support_tickets"("department_id");

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
