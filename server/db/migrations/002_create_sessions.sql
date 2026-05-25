-- 002_create_sessions.sql
-- connect-pg-simple's canonical session schema.
-- OIDS=FALSE clause dropped per Phase 0 ambiguity resolution D4 (Postgres 12+ ignores OIDs).

CREATE TABLE IF NOT EXISTS session (
  sid    VARCHAR        NOT NULL COLLATE "default",
  sess   JSON           NOT NULL,
  expire TIMESTAMP(6)   NOT NULL
);

ALTER TABLE session
  ADD CONSTRAINT session_pkey PRIMARY KEY (sid)
  NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX IF NOT EXISTS IDX_session_expire ON session (expire);
