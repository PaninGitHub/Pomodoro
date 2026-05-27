-- 007_create_settings.sql
-- Creates the settings table per Batch D §12.4.
-- ALL settings columns are created up-front even though Phase 2 only
-- surfaces a subset. Future phases edit additional columns without
-- requiring schema migrations.

CREATE TABLE IF NOT EXISTS settings (
  id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID          NOT NULL UNIQUE
                                       REFERENCES users(id) ON DELETE CASCADE,
  work_duration          INTEGER       NOT NULL DEFAULT 25,
  short_break_duration   INTEGER       NOT NULL DEFAULT 5,
  long_break_duration    INTEGER       NOT NULL DEFAULT 20,
  long_break_frequency   INTEGER       NOT NULL DEFAULT 4 CHECK (long_break_frequency >= 0),
  auto_start_breaks      BOOLEAN       NOT NULL DEFAULT false,
  auto_start_pomodoros   BOOLEAN       NOT NULL DEFAULT false,
  freestyle_ratio        NUMERIC(5,2)  NOT NULL DEFAULT 5.00,
  freestyle_accumulate   BOOLEAN       NOT NULL DEFAULT true,
  alarm_sound            VARCHAR(50)   NOT NULL DEFAULT 'bell',
  alarm_volume           INTEGER       NOT NULL DEFAULT 80 CHECK (alarm_volume BETWEEN 0 AND 100),
  alarm_repeats          INTEGER       NOT NULL DEFAULT 1 CHECK (alarm_repeats BETWEEN 1 AND 5),
  alarm_custom_url       TEXT          NULL,
  browser_notifications  BOOLEAN       NOT NULL DEFAULT false,
  reflection_enabled     BOOLEAN       NOT NULL DEFAULT true,
  music_autoplay         BOOLEAN       NOT NULL DEFAULT false,
  music_volume           INTEGER       NOT NULL DEFAULT 50 CHECK (music_volume BETWEEN 0 AND 100),
  last_sound_selected    VARCHAR(10)   NOT NULL DEFAULT 'S1',
  break_activity_limit   INTEGER       NOT NULL DEFAULT 10 CHECK (break_activity_limit BETWEEN 1 AND 30),
  theme                  VARCHAR(50)   NOT NULL DEFAULT 'bw-dark',
  font                   VARCHAR(50)   NOT NULL DEFAULT 'Inter',
  hour_format            VARCHAR(5)    NOT NULL DEFAULT '12h',
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Back-fill: existing users (pre-Phase-2) get a default settings row.
-- ON CONFLICT (user_id) DO NOTHING makes the migration idempotent and
-- safe on re-runs (M1 per Phase 2 plan).
INSERT INTO settings (user_id) SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;
