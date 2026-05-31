-- 017_add_modal_size.sql
-- Phase 5.5: per-user preference for the Logs modal viewport coverage.
--   'small'  ~60% width / 60vh height — quick-glance use
--   'medium' ~80% width / 80vh height — default, ergonomic for most screens
--   'large'  ~95% width / 95vh height — near-full-screen for deep review
--
-- Scoped to the Logs modal only for now. If future modals (PerModeSettings,
-- KeyboardShortcuts, etc.) want a sized variant, they can read the same
-- column — or a separate column can be added if the semantics diverge.
--
-- Numbered 017 because it's an additive ALTER on top of 007_create_settings.sql.

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS modal_size VARCHAR(8) NOT NULL DEFAULT 'medium'
  CHECK (modal_size IN ('small', 'medium', 'large'));
