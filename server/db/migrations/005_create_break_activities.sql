-- 005_create_break_activities.sql
-- Per Batch D §12.6. F-16: user-managed break activity library.
-- Maximum per user is enforced server-side via settings.break_activity_limit
-- (1-30, default 10; column added in migration 007).

CREATE TABLE IF NOT EXISTS break_activities (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(64)  NOT NULL,
  time_estimate INTEGER      NOT NULL CHECK (time_estimate BETWEEN 1 AND 1440),
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_break_activities_user_id ON break_activities (user_id);
