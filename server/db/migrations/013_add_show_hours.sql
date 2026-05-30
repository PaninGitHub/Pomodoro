-- 013_add_show_hours.sql
-- Phase 3.5 F1: per-user preference for the timer display format.
--
-- show_hours = true (default): timer renders as HH:MM:SS when the total
--   exceeds 60 minutes (existing behavior).
-- show_hours = false: timer renders as MMM:SS — minutes-only with a
--   3-digit minutes segment when > 99. Matches behavior of several
--   reference Pomodoro apps (e.g. "120:00" instead of "02:00:00").

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS show_hours BOOLEAN NOT NULL DEFAULT true;
