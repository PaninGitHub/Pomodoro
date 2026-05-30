-- 003_create_tasks.sql
-- Creates the tasks table per Batch D §12.5.

CREATE TABLE IF NOT EXISTS tasks (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(64)  NOT NULL,
  time_estimate INTEGER      NOT NULL CHECK (time_estimate BETWEEN 1 AND 1440),
  is_complete   BOOLEAN      NOT NULL DEFAULT false,
  sort_order    INTEGER      NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_sort ON tasks (user_id, sort_order);
