-- Keep a permanent record for every counter operating shift.
CREATE TABLE "CounterShift" (
  "id" UUID NOT NULL,
  "counterId" UUID NOT NULL,
  "staffId" UUID NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "openedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CounterShift_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "CounterSession" ADD COLUMN "shiftId" UUID;
ALTER TABLE "Ticket" ADD COLUMN "counterShiftId" UUID;
ALTER TABLE "Ticket" ADD COLUMN "serviceDurationSeconds" INTEGER;

-- Preserve sessions that were active when this migration was applied.
INSERT INTO "CounterShift" (
  "id", "counterId", "staffId", "startedAt", "openedAt", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid(), session."counterId", session."staffId", session."startedAt",
  CASE WHEN counter."status" = 'OPEN' THEN session."startedAt" ELSE NULL END,
  session."startedAt", CURRENT_TIMESTAMP
FROM "CounterSession" AS session
JOIN "Counter" AS counter ON counter."id" = session."counterId";

UPDATE "CounterSession" AS session
SET "shiftId" = shift."id"
FROM "CounterShift" AS shift
WHERE shift."counterId" = session."counterId" AND shift."staffId" = session."staffId" AND shift."endedAt" IS NULL;

ALTER TABLE "CounterSession" ALTER COLUMN "shiftId" SET NOT NULL;

CREATE UNIQUE INDEX "CounterSession_shiftId_key" ON "CounterSession"("shiftId");
CREATE INDEX "CounterShift_counterId_startedAt_idx" ON "CounterShift"("counterId", "startedAt");
CREATE INDEX "CounterShift_staffId_startedAt_idx" ON "CounterShift"("staffId", "startedAt");
CREATE INDEX "Ticket_counterShiftId_createdAt_idx" ON "Ticket"("counterShiftId", "createdAt");

ALTER TABLE "CounterShift" ADD CONSTRAINT "CounterShift_counterId_fkey"
  FOREIGN KEY ("counterId") REFERENCES "Counter"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CounterShift" ADD CONSTRAINT "CounterShift_staffId_fkey"
  FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CounterSession" ADD CONSTRAINT "CounterSession_shiftId_fkey"
  FOREIGN KEY ("shiftId") REFERENCES "CounterShift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_counterShiftId_fkey"
  FOREIGN KEY ("counterShiftId") REFERENCES "CounterShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
