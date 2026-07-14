-- Enterprise Service Desk — final schema freeze.
-- ticket_approvals mirrors requisition_approvals' exact shape/philosophy
-- (append-only approval log) rather than inventing a new pattern.
-- type_snapshot is additive/nullable — existing tickets are unaffected.

ALTER TABLE "support_tickets" ADD COLUMN "type_snapshot" JSONB;

CREATE TABLE "ticket_approvals" (
    "id"          TEXT NOT NULL,
    "ticket_id"   TEXT NOT NULL,
    "approver_id" TEXT NOT NULL,
    "action"      TEXT NOT NULL,
    "comment"     TEXT,
    "stage"       TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_approvals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ticket_approvals_ticket_id_idx" ON "ticket_approvals"("ticket_id");

ALTER TABLE "ticket_approvals" ADD CONSTRAINT "ticket_approvals_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_approvals" ADD CONSTRAINT "ticket_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
