# Migrations — numbering scheme

Files are numbered by the table they create, mapped to Batch D §12 sub-sections:

| File                              | Creates          | Spec    | Build phase |
|-----------------------------------|------------------|---------|-------------|
| `001_create_users.sql`            | users            | §12.3   | Phase 0     |
| `002_create_sessions.sql`         | session          | (connect-pg-simple schema) | Phase 0 |
| `003_create_tasks.sql`            | tasks            | §12.5   | Phase 2     |
| `004_create_reflections.sql`      | reflections      | §12.8   | Phase 3     |
| `005_create_break_activities.sql` | break_activities | §12.6   | Phase 4     |
| `006_create_break_logs.sql`       | break_logs       | §12.9   | Phase 4     |
| `007_create_settings.sql`         | settings         | §12.4   | Phase 2     |
| `008_create_custom_prompts.sql`   | custom_prompts   | §12.10  | Phase 3     |
| `009_create_timer_sessions.sql`   | timer_sessions   | §12.7   | Phase 3 (reflections prerequisite) |
| `010_add_timer_adjust_step.sql`   | (ALTER settings) | n/a     | Phase 2 (user-feedback revision) |
| `011_add_freestyle_breaks_enabled.sql` | (ALTER settings) | n/a | Phase 2 (Freestyle redesign C-09) |
| `012_add_avatar_and_freestyle_target.sql` | (ALTER settings) | n/a | Phase 2 (mid-fix: avatar toggle + Freestyle target moved into settings) |
| `013_add_show_hours.sql`          | (ALTER settings) | n/a     | Phase 3.5 (F1: HH:MM:SS vs MMM:SS timer format toggle) |
| `014_add_week_start.sql`          | (ALTER settings) | n/a     | Phase 3.5 (F-10 prereq: week-start day for log viewer grouping) |
| `015_add_session_and_activity_fks.sql` | (ALTER reflections + break_logs) | n/a | Phase 4 (FK ordering fix — see "FK ordering" below) |

**Numbers correspond to the table.** Build phases may run migrations out
of strict numeric order (Phase 2 runs 003 + 007 but skips 004–006 which
land in Phases 3–4). The runner orders by filename alphabetically and
only applies files not present in `_migrations`, so a later phase's 004
applies cleanly on top of an environment that already has 003 + 007.

**FK ordering.** A CREATE TABLE migration whose inline FK references a
table created in a later-numbered migration **will fail on any fresh
database** because the runner orders alphabetically. Two such cases
existed (`004 → 009` for reflections.session_id) or were about to exist
(`006 → 009` for break_logs.session_id, `006 → 005` for
break_logs.activity_id). The fix is the pattern used in `015`:

1. The CREATE TABLE migration declares the column without an inline
   `REFERENCES …` clause.
2. A later migration (`015`) adds the FK via `ALTER TABLE … ADD
   CONSTRAINT`, guarded by `DROP CONSTRAINT IF EXISTS` so it is
   idempotent on environments where the constraint may already exist
   (e.g. prod, where the FK was inline before `004` was retroactively
   edited).
3. The constraint is named explicitly to match Postgres's auto-generated
   pattern `{table}_{column}_fkey`, so `DROP IF EXISTS` finds and drops
   the pre-existing auto-named constraint.

If a future migration adds a new column with an FK to a not-yet-created
table, follow the same split: column-only in the CREATE TABLE migration,
constraint in a later ALTER migration that sorts after every referenced
table.

**Always run via `npm run migrate`** at the repo root. The runner is
idempotent; re-running is a no-op.

**Never edit an applied migration** — except to remove an inline FK
clause that breaks fresh-DB ordering, where the replacement constraint
is added in a later migration with the same name + semantics (see `015`
for the only sanctioned case). This trade-off is preferable to renaming
applied files, which would leave `_migrations` entries dangling.
