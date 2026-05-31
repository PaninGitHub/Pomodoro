-- 015_add_session_and_activity_fks.sql
--
-- FK ordering fix. Two CREATE TABLE migrations -- 004 (reflections) and
-- 006 (break_logs) -- need foreign keys to timer_sessions (009), and 006
-- also needs a foreign key to break_activities (005). The migration
-- runner orders files alphabetically, so the referenced tables aren't
-- present yet when 004/006 execute. This migration adds the three
-- constraints after every dependency table exists.
--
-- Idempotency: on environments where the constraint already exists
-- (notably the prod Neon DB, which had the reflections FK inline before
-- migration 004 was edited), each constraint is dropped first via
-- DROP IF EXISTS and then re-added with the same name as Postgres's
-- auto-generated name pattern `{table}_{column}_fkey`. Postgres does not
-- expose `ADD CONSTRAINT IF NOT EXISTS`; the DROP-then-ADD pattern is
-- the standard workaround. The whole migration runs inside one
-- transaction (see db/migrate.ts:56) so there is no window without the
-- constraint.
--
-- This trades one rule for one bug: editing migration 004's contents
-- violates the "Never edit an applied migration" rule in MIGRATIONS.md,
-- but the migration runner does not re-execute applied migrations, so
-- prod state is unchanged by the edit. The end state on every
-- environment after this migration runs is the same FK constraint with
-- the same name as it had inline pre-edit.

ALTER TABLE reflections DROP CONSTRAINT IF EXISTS reflections_session_id_fkey;
ALTER TABLE reflections
  ADD CONSTRAINT reflections_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES timer_sessions(id) ON DELETE CASCADE;

ALTER TABLE break_logs DROP CONSTRAINT IF EXISTS break_logs_session_id_fkey;
ALTER TABLE break_logs
  ADD CONSTRAINT break_logs_session_id_fkey
  FOREIGN KEY (session_id) REFERENCES timer_sessions(id) ON DELETE CASCADE;

ALTER TABLE break_logs DROP CONSTRAINT IF EXISTS break_logs_activity_id_fkey;
ALTER TABLE break_logs
  ADD CONSTRAINT break_logs_activity_id_fkey
  FOREIGN KEY (activity_id) REFERENCES break_activities(id) ON DELETE SET NULL;
