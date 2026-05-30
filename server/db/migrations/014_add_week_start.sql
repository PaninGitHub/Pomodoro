-- 014_add_week_start.sql
-- Phase 3.5 F-10 prerequisite: per-user preference for which day a week
-- begins on. Used by the Reflection log viewer's week-view grouping.
-- Default is 'sunday' (US convention). Other regions can switch to
-- 'monday' (ISO 8601 / EU convention).

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS week_start VARCHAR(10) NOT NULL DEFAULT 'sunday'
  CHECK (week_start IN ('sunday', 'monday'));
