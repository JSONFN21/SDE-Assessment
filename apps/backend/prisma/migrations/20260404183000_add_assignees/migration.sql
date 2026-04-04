-- Add assignees list to tasks so work can be assigned to teammates.
ALTER TABLE "Task"
ADD COLUMN "assignees" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "Task"
SET "assignees" = ARRAY[]::TEXT[]
WHERE "assignees" IS NULL;

ALTER TABLE "Task"
ALTER COLUMN "assignees" SET NOT NULL;
