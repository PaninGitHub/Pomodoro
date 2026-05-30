-- 009_create_timer_sessions.sql
-- Per Batch D §12.7. Full column set including is_interrupted +
-- interrupted_at (used later by F-23 session resume) so a future
-- phase doesn't need an ALTER. Reflections (migration 004) FK to
-- this table on session_id.

CREATE TABLE IF NOT EXISTS timer_sessions (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode               VARCHAR(20)  NOT NULL CHECK (mode IN ('timer', 'pomodoro', 'freestyle')),
  started_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ended_at           TIMESTAMPTZ  NULL,
  ended_early        BOOLEAN      NOT NULL DEFAULT false,
  total_work_mins    INTEGER      NULL,
  periods_completed  INTEGER      NOT NULL DEFAULT 0,
  is_interrupted     BOOLEAN      NOT NULL DEFAULT false,
  interrupted_at     TIMESTAMPTZ  NULL
);

CREATE INDEX IF NOT EXISTS idx_timer_sessions_user ON timer_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_timer_sessions_user_started ON timer_sessions (user_id, started_at);
