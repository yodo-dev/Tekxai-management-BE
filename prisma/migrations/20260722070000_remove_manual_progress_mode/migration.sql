-- Progress % is now always auto-calculated from milestone completion — the
-- MANUAL mode is removed entirely (no code path can set progress_mode or
-- progress directly anymore; see normalize_project() / update_project()).
-- Migrate every existing row to AUTO and flip the column default so any
-- future direct-DB insert lands on the only supported value.
UPDATE "projects" SET "progress_mode" = 'AUTO' WHERE "progress_mode" IS DISTINCT FROM 'AUTO';
ALTER TABLE "projects" ALTER COLUMN "progress_mode" SET DEFAULT 'AUTO';
