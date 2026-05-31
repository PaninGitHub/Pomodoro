-- 018_add_shortcut_settings.sql
-- Phase 5.5: user-customizable global keyboard shortcuts.
--
-- shortcuts_enabled: master on/off — when false, the client's
--   useGlobalHotkeys hook returns early and no key is intercepted.
--
-- shortcut_bindings: NULL means "use the built-in defaults for every
--   action". An object stores partial overrides keyed by action_id
--   (e.g. {"end_session": "Backspace", "open_settings": null}). A
--   string value re-binds the action to that key (modifier combos
--   like "Ctrl+T" allowed). A null value disables that action while
--   still letting other defaults apply.
--
-- Server only validates structural shape (string-or-null values).
-- Action ID existence is enforced by the client; stale overrides for
-- removed actions are silently ignored by the hook.

ALTER TABLE settings
  ADD COLUMN IF NOT EXISTS shortcuts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS shortcut_bindings JSONB NULL;
