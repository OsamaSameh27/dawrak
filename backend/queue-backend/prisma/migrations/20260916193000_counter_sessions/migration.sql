CREATE TABLE "CounterSession" (
  "id" UUID NOT NULL,
  "counterId" UUID NOT NULL,
  "staffId" UUID NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CounterSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CounterSession_counterId_key" ON "CounterSession"("counterId");
CREATE UNIQUE INDEX "CounterSession_staffId_key" ON "CounterSession"("staffId");
CREATE INDEX "CounterSession_lastSeenAt_idx" ON "CounterSession"("lastSeenAt");

ALTER TABLE "CounterSession"
ADD CONSTRAINT "CounterSession_counterId_fkey"
FOREIGN KEY ("counterId") REFERENCES "Counter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CounterSession"
ADD CONSTRAINT "CounterSession_staffId_fkey"
FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
