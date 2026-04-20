-- Create symptom category enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SymptomCategory') THEN
    CREATE TYPE "SymptomCategory" AS ENUM ('cramps', 'mood', 'digestion', 'skin', 'energy');
  END IF;
END $$;

-- Enhance symptom logs with category and severity
ALTER TABLE "symptom_logs"
ADD COLUMN IF NOT EXISTS "category" "SymptomCategory" NOT NULL DEFAULT 'cramps',
ADD COLUMN IF NOT EXISTS "severity" INTEGER NOT NULL DEFAULT 3;

ALTER TABLE "symptom_logs"
DROP CONSTRAINT IF EXISTS "symptom_logs_severity_check";

ALTER TABLE "symptom_logs"
ADD CONSTRAINT "symptom_logs_severity_check" CHECK ("severity" >= 1 AND "severity" <= 5);

CREATE INDEX IF NOT EXISTS "symptom_logs_user_id_category_idx"
ON "symptom_logs"("user_id", "category");

-- Create fertility logs table
CREATE TABLE IF NOT EXISTS "fertility_logs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "basal_temp" DOUBLE PRECISION,
  "cervical_mucus" TEXT,
  "ovulation_test" BOOLEAN,
  "intercourse" BOOLEAN,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "fertility_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "fertility_logs_user_id_date_key"
ON "fertility_logs"("user_id", "date");

CREATE INDEX IF NOT EXISTS "fertility_logs_user_id_idx"
ON "fertility_logs"("user_id");

CREATE INDEX IF NOT EXISTS "fertility_logs_date_idx"
ON "fertility_logs"("date");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fertility_logs_user_id_fkey'
  ) THEN
    ALTER TABLE "fertility_logs"
    ADD CONSTRAINT "fertility_logs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Create medications table
CREATE TABLE IF NOT EXISTS "medications" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "dosage" TEXT NOT NULL,
  "frequency" TEXT NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE,
  "notes" TEXT,
  CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "medications_user_id_idx"
ON "medications"("user_id");

CREATE INDEX IF NOT EXISTS "medications_start_date_idx"
ON "medications"("start_date");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'medications_user_id_fkey'
  ) THEN
    ALTER TABLE "medications"
    ADD CONSTRAINT "medications_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
