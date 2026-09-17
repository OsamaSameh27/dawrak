ALTER TABLE "Branch"
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

UPDATE "Branch"
SET "latitude" = 30.0561, "longitude" = 31.33
WHERE "code" = 'NASR';
