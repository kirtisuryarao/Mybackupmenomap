UPDATE cycles c
SET length = u.cycle_length,
    period_length = u.period_duration
FROM users u
WHERE c.user_id = u.id
  AND (c.length IS NULL OR c.period_length IS NULL);

ALTER TABLE cycles
  ALTER COLUMN length SET NOT NULL,
  ALTER COLUMN period_length SET NOT NULL;

CREATE TABLE IF NOT EXISTS symptom_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  symptoms TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  mood TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS symptom_logs_user_id_idx ON symptom_logs(user_id);
CREATE INDEX IF NOT EXISTS symptom_logs_date_idx ON symptom_logs(date);
