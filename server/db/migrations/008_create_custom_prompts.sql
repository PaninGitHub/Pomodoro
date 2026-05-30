-- 008_create_custom_prompts.sql
-- Per Batch D §12.10. Per-user customizable reflection prompt text.
-- Defaults seeded from server/config/reflectionPrompts.ts.
--
-- New-user seed happens in the upsertUserFromGoogleProfile transaction
-- (server/auth/upsertUser.ts) — see Task 23.
--
-- The back-fill below covers existing users (pre-Phase-3) by
-- INSERTing one row per (existing user x every known prompt_key)
-- with the default text. The 8 default texts are inlined here so
-- the migration is self-contained.

CREATE TABLE IF NOT EXISTS custom_prompts (
  id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prompt_key   VARCHAR(100)  NOT NULL,
  prompt_text  VARCHAR(1280) NOT NULL,
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, prompt_key)
);

CREATE INDEX IF NOT EXISTS idx_custom_prompts_user ON custom_prompts (user_id);

-- Back-fill existing users with default prompt text for every known key.
-- ON CONFLICT (user_id, prompt_key) DO NOTHING makes this idempotent.
INSERT INTO custom_prompts (user_id, prompt_key, prompt_text)
SELECT u.id, p.prompt_key, p.prompt_text
FROM users u
CROSS JOIN (VALUES
  ('did_well',            'What did you do well?'),
  ('do_better',           'What can you do better?'),
  ('hindrance_options',   'What hindered your focus?'),
  ('hindrance_detail',    'What specifically caused it / how to avoid it?'),
  ('task_structure_note', 'How can you structure your tasks better?'),
  ('accomplishment',      'What was your biggest accomplishment today?'),
  ('obstacle',            'What was your biggest obstacle today?'),
  ('do_differently',      'What will you do differently next session?')
) AS p(prompt_key, prompt_text)
ON CONFLICT (user_id, prompt_key) DO NOTHING;
