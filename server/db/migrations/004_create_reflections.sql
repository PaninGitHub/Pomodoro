-- 004_create_reflections.sql
-- Per Batch D §12.8 with correction D-04 applied (tasks_snapshot
-- per-entry shape extended with added_during_period boolean).

CREATE TABLE IF NOT EXISTS reflections (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id      UUID         NOT NULL REFERENCES timer_sessions(id) ON DELETE CASCADE,
  type            VARCHAR(20)  NOT NULL CHECK (type IN ('per_period', 'session')),
  period_number   INTEGER      NULL,
  focus_rating    INTEGER      NULL CHECK (focus_rating BETWEEN 1 AND 4),
  answers         JSONB        NULL,
  tasks_snapshot  JSONB        NULL,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reflections_user_id ON reflections (user_id);
CREATE INDEX IF NOT EXISTS idx_reflections_user_created ON reflections (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reflections_session ON reflections (session_id);
CREATE INDEX IF NOT EXISTS idx_reflections_focus ON reflections (focus_rating);
