-- 006_create_break_logs.sql
-- Per Batch D §12.9. F-17 emits one log row per break period.
--
-- FK ordering note: session_id and activity_id are columns only here.
-- The FKs to timer_sessions(id) and break_activities(id) are added in
-- migration 015. timer_sessions is created in migration 009 and the
-- migration runner orders files alphabetically (006 < 009), so an
-- inline FK clause would fail on a fresh DB. break_activities (005)
-- sorts before 006, but the FK is co-located with the reflections FK
-- fix in 015 for a single audit point.
--
-- activity_id NULL handling: when a user dismisses the F-17 popup
-- without selecting, the row is still emitted with activity_id = NULL
-- and activity_name = NULL. activity_name is denormalized so the log
-- entry survives if the source activity is later deleted (ON DELETE
-- SET NULL on activity_id, declared in 015).

CREATE TABLE IF NOT EXISTS break_logs (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id       UUID         NOT NULL,
  activity_id      UUID         NULL,
  activity_name    VARCHAR(64)  NULL,
  break_started_at TIMESTAMPTZ  NOT NULL,
  break_ended_at   TIMESTAMPTZ  NULL
);

CREATE INDEX IF NOT EXISTS idx_break_logs_user_id ON break_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_break_logs_user_started ON break_logs (user_id, break_started_at);
