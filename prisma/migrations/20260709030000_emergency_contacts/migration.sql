-- Sprint 1 Phase 2 Milestone 4 — Emergency Contacts.
-- Additive only. Promotes the old flat single-contact fields on
-- employee_profiles (emergency_contact_name / _relation / _phone) into a
-- proper one-to-many "emergency_contacts" table supporting multiple contacts
-- per employee.
--
-- The old flat fields on employee_profiles are intentionally left untouched
-- and no data is migrated out of them here — retiring them is a future
-- decision, not part of this migration.
CREATE TABLE IF NOT EXISTS "emergency_contacts" (
    "id"         TEXT NOT NULL,
    "user_id"    TEXT NOT NULL,
    "name"       TEXT NOT NULL,
    "relation"   TEXT NOT NULL,
    "phone"      TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "emergency_contacts_user_id_idx" ON "emergency_contacts"("user_id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'emergency_contacts_user_id_fkey'
    ) THEN
        ALTER TABLE "emergency_contacts"
            ADD CONSTRAINT "emergency_contacts_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
