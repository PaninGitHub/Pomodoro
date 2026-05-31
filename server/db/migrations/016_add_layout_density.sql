-- 016_add_layout_density.sql
-- Phase 4.5: per-user preference for the Settings page layout.
--   'auto'        — pick based on viewport width (>= 1024px → tabs,
--                   < 1024px → collapsible). Default for new users.
--   'tabs'        — always horizontal tabs.
--   'collapsible' — always vertical collapsible sections.
--
-- Numbered 016 because it's an additive ALTER on top of 007_create_settings.sql.

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS layout_density VARCHAR(16) NOT NULL DEFAULT 'auto'
  CHECK (layout_density IN ('auto', 'tabs', 'collapsible'));
