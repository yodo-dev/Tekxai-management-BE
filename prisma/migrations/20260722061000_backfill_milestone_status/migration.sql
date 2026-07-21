-- Data backfill only. The previous migration added milestones.status with a
-- blanket DEFAULT 'NOT_STARTED' for every existing row, including ones that
-- already had completed=true or blocked=true — without this, those rows
-- would silently regress (a completed milestone reading as NOT_STARTED).
-- status becomes canonical going forward (see milestones.repository.js);
-- this one-time backfill makes existing rows agree with it before that.
UPDATE "milestones" SET "status" = 'COMPLETED' WHERE "completed" = true;
UPDATE "milestones" SET "status" = 'BLOCKED' WHERE "completed" = false AND "blocked" = true;
