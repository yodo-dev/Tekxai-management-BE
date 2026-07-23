-- Lifecycle automation needs a document type to auto-generate against when
-- an employee is confirmed (PROBATION -> ACTIVE_EMPLOYMENT). Nothing existing
-- matches "Confirmation Letter" — RELIEVING_LETTER (offboarding) already
-- covers the exit-side automation and needs no new seed row.
INSERT INTO "hr_document_types" ("id", "category_id", "code", "name", "sort_order", "created_at", "updated_at") VALUES
  ('hrdoctype_confirmation_letter', 'hrdoccat_employment', 'CONFIRMATION_LETTER', 'Confirmation Letter', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
