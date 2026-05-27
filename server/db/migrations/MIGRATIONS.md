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
| `009_create_timer_sessions.sql`   | timer_sessions   | §12.7   | Phase 3     |
| `010_add_timer_adjust_step.sql`   | (ALTER settings) | n/a     | Phase 2 (user-feedback revision) |
| `011_add_freestyle_breaks_enabled.sql` | (ALTER settings) | n/a | Phase 2 (Freestyle redesign C-09) |

**Numbers correspond to the table.** Build phases may run migrations out
of strict numeric order (Phase 2 runs 003 + 007 but skips 004–006 which
land in Phases 3–4). The runner orders by filename alphabetically and
only applies files not present in `_migrations`, so a later phase's 004
applies cleanly on top of an environment that already has 003 + 007.

**Always run via `npm run migrate`** at the repo root. The runner is
idempotent; re-running is a no-op.

**Never edit an applied migration.** Schema changes require a new
numbered file.
