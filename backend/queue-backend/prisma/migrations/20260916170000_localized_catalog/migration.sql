-- Keep the legacy English fields while adding bilingual fields and numeric counters.
ALTER TABLE "Branch"
ADD COLUMN "nameAr" TEXT,
ADD COLUMN "nameEn" TEXT,
ADD COLUMN "addressAr" TEXT,
ADD COLUMN "addressEn" TEXT;

ALTER TABLE "Service"
ADD COLUMN "nameAr" TEXT,
ADD COLUMN "nameEn" TEXT,
ADD COLUMN "descriptionAr" TEXT,
ADD COLUMN "descriptionEn" TEXT;

ALTER TABLE "Counter" ADD COLUMN "number" INTEGER;

UPDATE "Branch"
SET
  "nameEn" = "name",
  "nameAr" = CASE WHEN "code" = 'NASR' THEN 'فرع مدينة نصر' ELSE "name" END,
  "addressEn" = "address",
  "addressAr" = CASE WHEN "code" = 'NASR' THEN 'مدينة نصر، القاهرة' ELSE "address" END;

UPDATE "Service"
SET
  "nameEn" = "name",
  "nameAr" = CASE
    WHEN "prefix" = 'D' THEN 'كشف الأسنان'
    WHEN "prefix" = 'G' THEN 'الكشف العام'
    ELSE "name"
  END,
  "descriptionEn" = "description",
  "descriptionAr" = CASE
    WHEN "prefix" = 'D' THEN 'طابور الكشف العام للأسنان'
    WHEN "prefix" = 'G' THEN 'طابور الكشف العام'
    ELSE "description"
  END;

WITH numbered_counters AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "branchId" ORDER BY "createdAt", "id"
  )::INTEGER AS "counterNumber"
  FROM "Counter"
)
UPDATE "Counter"
SET "number" = numbered_counters."counterNumber"
FROM numbered_counters
WHERE "Counter"."id" = numbered_counters."id";

ALTER TABLE "Branch"
ALTER COLUMN "nameAr" SET NOT NULL,
ALTER COLUMN "nameEn" SET NOT NULL;

ALTER TABLE "Service"
ALTER COLUMN "nameAr" SET NOT NULL,
ALTER COLUMN "nameEn" SET NOT NULL;

ALTER TABLE "Counter" ALTER COLUMN "number" SET NOT NULL;

CREATE UNIQUE INDEX "Counter_branchId_number_key" ON "Counter"("branchId", "number");
