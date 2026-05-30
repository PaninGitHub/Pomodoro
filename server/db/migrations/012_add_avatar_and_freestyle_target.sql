-- 012_add_avatar_and_freestyle_target.sql
-- Phase 2 mid-fix batch.
--
-- 1. show_avatar: per-user preference for displaying the Google avatar in
--    the header. Default true. Toggled from Settings → Appearance.
-- 2. freestyle_target_minutes: persisted Freestyle work-duration target
--    (C-09 amendment). Previously edited inline on the timer display;
--    now lives in the per-mode settings popup only. Default 25 min,
--    capped at the per-period 12-hour limit (720 min).

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS show_avatar BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS freestyle_target_minutes INTEGER NOT NULL DEFAULT 25
  CHECK (freestyle_target_minutes BETWEEN 1 AND 720);
