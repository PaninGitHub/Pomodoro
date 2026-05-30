-- 011_add_freestyle_breaks_enabled.sql
-- Phase 2 user-feedback Freestyle redesign (spec correction C-09).
-- Adds a persistent toggle for "Freestyle breaks enabled". When false,
-- the work-period-end prompt skips the break entirely and ends the
-- session immediately.

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS freestyle_breaks_enabled BOOLEAN NOT NULL DEFAULT true;
