UPDATE "Service"
SET
  "description" = COALESCE("description", 'General examination queue'),
  "descriptionEn" = COALESCE("descriptionEn", 'General examination queue')
WHERE "prefix" = 'G';
