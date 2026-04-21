ALTER TABLE users
  ADD COLUMN IF NOT EXISTS period_length INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS menopause_stage TEXT NOT NULL DEFAULT 'regular';

CREATE TABLE IF NOT EXISTS health_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
  mood TEXT,
  sleep_hours DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT health_logs_user_id_date_key UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS health_logs_user_id_idx ON health_logs(user_id);
CREATE INDEX IF NOT EXISTS health_logs_date_idx ON health_logs(date);