-- 010_add_timer_adjust_step.sql
-- Adds the +/- adjust step (default 5 minutes) to the settings table per
-- Phase 2 user-feedback revision. Numbered 010 because it's an additive
-- alteration on top of 007_create_settings.sql.

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS timer_adjust_step_minutes INTEGER NOT NULL DEFAULT 5
  CHECK (timer_adjust_step_minutes BETWEEN 1 AND 60);
