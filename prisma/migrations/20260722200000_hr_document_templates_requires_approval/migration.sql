-- Single-step approval gate for HR document templates: when true,
-- generate_document() creates the resulting document as DRAFT (pending
-- HR approval) instead of GENERATED.
ALTER TABLE "hr_document_templates" ADD COLUMN "requires_approval" BOOLEAN NOT NULL DEFAULT false;
