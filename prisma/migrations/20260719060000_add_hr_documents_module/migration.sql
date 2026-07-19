-- CreateTable
CREATE TABLE "hr_document_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_document_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_document_types" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_document_templates" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "type_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "current_version_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_document_template_versions" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "placeholders" JSONB NOT NULL DEFAULT '[]',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_document_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_documents" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "type_id" TEXT NOT NULL,
    "template_id" TEXT,
    "template_version_id" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "file_key" TEXT,
    "valid_from" TIMESTAMP(3),
    "valid_until" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "viewed_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),
    "previous_document_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_document_signatures" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "signer_role" TEXT NOT NULL,
    "signer_user_id" TEXT,
    "signature_data" TEXT,
    "signed_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_document_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "logo_url" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hr_document_categories_code_key" ON "hr_document_categories"("code");

-- CreateIndex
CREATE INDEX "hr_document_categories_is_active_idx" ON "hr_document_categories"("is_active");

-- CreateIndex
CREATE INDEX "hr_document_types_category_id_idx" ON "hr_document_types"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "hr_document_types_category_id_code_key" ON "hr_document_types"("category_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "hr_document_templates_current_version_id_key" ON "hr_document_templates"("current_version_id");

-- CreateIndex
CREATE INDEX "hr_document_templates_category_id_idx" ON "hr_document_templates"("category_id");

-- CreateIndex
CREATE INDEX "hr_document_templates_type_id_idx" ON "hr_document_templates"("type_id");

-- CreateIndex
CREATE INDEX "hr_document_template_versions_template_id_idx" ON "hr_document_template_versions"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "hr_document_template_versions_template_id_version_key" ON "hr_document_template_versions"("template_id", "version");

-- CreateIndex
CREATE INDEX "hr_documents_user_id_idx" ON "hr_documents"("user_id");

-- CreateIndex
CREATE INDEX "hr_documents_category_id_idx" ON "hr_documents"("category_id");

-- CreateIndex
CREATE INDEX "hr_documents_type_id_idx" ON "hr_documents"("type_id");

-- CreateIndex
CREATE INDEX "hr_documents_status_idx" ON "hr_documents"("status");

-- CreateIndex
CREATE INDEX "hr_document_signatures_document_id_idx" ON "hr_document_signatures"("document_id");

-- AddForeignKey
ALTER TABLE "hr_document_types" ADD CONSTRAINT "hr_document_types_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "hr_document_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_document_templates" ADD CONSTRAINT "hr_document_templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "hr_document_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_document_templates" ADD CONSTRAINT "hr_document_templates_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "hr_document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_document_templates" ADD CONSTRAINT "hr_document_templates_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "hr_document_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_document_template_versions" ADD CONSTRAINT "hr_document_template_versions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "hr_document_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_documents" ADD CONSTRAINT "hr_documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_documents" ADD CONSTRAINT "hr_documents_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "hr_document_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_documents" ADD CONSTRAINT "hr_documents_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "hr_document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_documents" ADD CONSTRAINT "hr_documents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "hr_document_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_documents" ADD CONSTRAINT "hr_documents_template_version_id_fkey" FOREIGN KEY ("template_version_id") REFERENCES "hr_document_template_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_documents" ADD CONSTRAINT "hr_documents_previous_document_id_fkey" FOREIGN KEY ("previous_document_id") REFERENCES "hr_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_document_signatures" ADD CONSTRAINT "hr_document_signatures_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "hr_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Seed default categories (idempotent-safe, this migration only ever runs once per DB)
INSERT INTO "hr_document_categories" ("id", "code", "name", "sort_order", "created_at", "updated_at") VALUES
  ('hrdoccat_employment',  'EMPLOYMENT',  'Employment',  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hrdoccat_legal',       'LEGAL',       'Legal',       2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hrdoccat_performance', 'PERFORMANCE', 'Performance', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hrdoccat_assets',      'ASSETS',      'Assets',      4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hrdoccat_compensation','COMPENSATION','Compensation',5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hrdoccat_benefits',    'BENEFITS',    'Benefits',    6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hrdoccat_compliance',  'COMPLIANCE',  'Compliance',  7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hrdoccat_offboarding', 'OFFBOARDING', 'Offboarding', 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hrdoccat_custom',      'CUSTOM',      'Custom',      9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed a starter document type per category so the module isn't empty on day one
INSERT INTO "hr_document_types" ("id", "category_id", "code", "name", "sort_order", "created_at", "updated_at") VALUES
  ('hrdoctype_offer_letter',       'hrdoccat_employment',  'OFFER_LETTER',       'Offer Letter',            1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hrdoctype_employment_contract','hrdoccat_employment',  'EMPLOYMENT_CONTRACT','Employment Contract',     2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hrdoctype_nda',                'hrdoccat_legal',       'NDA',                'Non-Disclosure Agreement',1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hrdoctype_warning_letter',     'hrdoccat_performance', 'WARNING_LETTER',     'Warning Letter',          1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hrdoctype_asset_agreement',    'hrdoccat_assets',      'ASSET_AGREEMENT',    'Asset Agreement',         1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hrdoctype_salary_revision',    'hrdoccat_compensation','SALARY_REVISION',    'Salary Revision Letter',  1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hrdoctype_benefits_enrollment','hrdoccat_benefits',    'BENEFITS_ENROLLMENT','Benefits Enrollment',     1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hrdoctype_compliance_ack',     'hrdoccat_compliance',  'COMPLIANCE_ACK',     'Compliance Acknowledgement',1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hrdoctype_relieving_letter',   'hrdoccat_offboarding', 'RELIEVING_LETTER',   'Relieving Letter',        1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('hrdoctype_custom_generic',     'hrdoccat_custom',      'GENERIC',            'Generic Document',        1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Seed a singleton company_settings row so the {{company_*}} placeholders
-- always resolve to something (even if blank) instead of throwing.
INSERT INTO "company_settings" ("id", "name", "updated_at") VALUES
  ('company_settings_singleton', 'TekXAI', CURRENT_TIMESTAMP);
