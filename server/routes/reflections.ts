import { Router, type Request, type Response, type NextFunction } from 'express';
import type postgres from 'postgres';
import { requireAuth } from '../middleware/requireAuth';
import { parseUuid } from '../utils/parseUuid';
import { validateCreateReflection, validateUpdateReflection } from '../utils/validateReflection';
import type { PublicReflection } from '../types/db';

function getUserId(req: Request): string {
  return (req.user as { id: string }).id;
}

function createReflectionHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const v = validateCreateReflection(req.body);
      if (!v.ok) {
        res.status(400).json({ error: v.error });
        return;
      }

      // Verify the session belongs to this user before inserting.
      // Plain-text 400 ('session...'); we don't leak whether the session
      // exists for a different user vs not at all.
      const sessionRows = await sql`
        SELECT id FROM timer_sessions
        WHERE id = ${v.value.session_id} AND user_id = ${userId}
        LIMIT 1
      `;
      if (sessionRows.length === 0) {
        res.status(400).json({ error: 'session_id does not belong to the current user.' });
        return;
      }

      // sql.json() expects a JSONValue (read-only index signature). Our
      // validator outputs typed shapes that are structurally compatible
      // at runtime but don't satisfy the strict type. Cast through any —
      // the runtime payload is plain JSON the validator already vetted.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const answersJson = sql.json(v.value.answers as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const snapshotJson = sql.json(v.value.tasks_snapshot as any);
      const [row] = await sql<PublicReflection[]>`
        INSERT INTO reflections
          (user_id, session_id, type, period_number, focus_rating, answers, tasks_snapshot)
        VALUES
          (${userId}, ${v.value.session_id}, ${v.value.type},
           ${v.value.period_number}, ${v.value.focus_rating},
           ${answersJson}, ${snapshotJson})
        RETURNING id, session_id, type, period_number, focus_rating, answers, tasks_snapshot, created_at
      `;
      res.status(201).json({ reflection: row });
    } catch (err) {
      next(err);
    }
  };
}

function parseIsoDate(v: unknown): Date | null {
  if (typeof v !== 'string') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const MAX_REFLECTIONS_PER_REQUEST = 500;

function listReflectionsHandler(sql: postgres.Sql) {
  // F-10: list user reflections ordered newest-first. Optional query
  // filters: from (ISO date inclusive), to (ISO date inclusive),
  // focus_rating (1-4), task_name (case-insensitive substring against
  // any task name in tasks_snapshot). Returns up to 500 rows — no
  // pagination in v1 since a single user is very unlikely to exceed
  // that mid-Phase-3.5; cursor paging is a Phase 4+ optimization.
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);

      const fromDate = parseIsoDate(req.query.from);
      const toDate = parseIsoDate(req.query.to);
      const focusRaw = req.query.focus_rating;
      const focusRating = typeof focusRaw === 'string' ? Number.parseInt(focusRaw, 10) : NaN;
      const focusFilter = Number.isInteger(focusRating) && focusRating >= 1 && focusRating <= 4
        ? focusRating
        : null;
      const taskNameRaw = req.query.task_name;
      const taskName = typeof taskNameRaw === 'string' && taskNameRaw.length > 0
        ? taskNameRaw
        : null;

      // Build a single query with conditional WHERE fragments via postgres.js.
      // The user_id scope is always applied first; the rest are tacked on
      // only when their filter is set.
      const rows = await sql<PublicReflection[]>`
        SELECT id, session_id, type, period_number, focus_rating, answers, tasks_snapshot, created_at
        FROM reflections
        WHERE user_id = ${userId}
          ${fromDate ? sql`AND created_at >= ${fromDate}` : sql``}
          ${toDate ? sql`AND created_at <= ${toDate}` : sql``}
          ${focusFilter !== null ? sql`AND focus_rating = ${focusFilter}` : sql``}
          ${taskName ? sql`AND EXISTS (
            SELECT 1 FROM jsonb_array_elements(tasks_snapshot) AS t
            WHERE LOWER(t->>'name') LIKE LOWER(${'%' + taskName + '%'})
          )` : sql``}
        ORDER BY created_at DESC
        LIMIT ${MAX_REFLECTIONS_PER_REQUEST}
      `;
      res.status(200).json({ reflections: rows });
    } catch (err) {
      next(err);
    }
  };
}

function patchReflectionHandler(sql: postgres.Sql) {
  // F-10 edit: allows changing focus_rating, answers, tasks_snapshot on
  // a past entry. type / period_number / session_id stay immutable —
  // changing them would mean it's a different entry, not an edit.
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const idResult = parseUuid(req.params.id);
      if (!idResult.ok) {
        res.status(400).json({ error: 'Invalid reflection ID.' });
        return;
      }
      const v = validateUpdateReflection(req.body);
      if (!v.ok) {
        res.status(400).json({ error: v.error });
        return;
      }

      // postgres.js sql() helper takes an object for dynamic SET. JSONB
      // columns need an explicit sql.json() wrapper (same any-cast pattern
      // as createReflectionHandler — runtime is validated JSON).
      const fields: Record<string, unknown> = { updated_at: new Date() };
      if (v.value.focus_rating !== undefined) fields.focus_rating = v.value.focus_rating;
      if (v.value.answers !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fields.answers = sql.json(v.value.answers as any);
      }
      if (v.value.tasks_snapshot !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fields.tasks_snapshot = sql.json(v.value.tasks_snapshot as any);
      }

      const updated = await sql<PublicReflection[]>`
        UPDATE reflections SET ${sql(fields)}
        WHERE id = ${idResult.value} AND user_id = ${userId}
        RETURNING id, session_id, type, period_number, focus_rating, answers, tasks_snapshot, created_at
      `;
      if (updated.length === 0) {
        res.status(404).json({ error: 'Reflection not found.' });
        return;
      }
      res.status(200).json({ reflection: updated[0] });
    } catch (err) {
      next(err);
    }
  };
}

export function buildReflectionsRouter(sql: postgres.Sql): Router {
  const router = Router();
  router.use(requireAuth);
  router.post('/', createReflectionHandler(sql));
  router.get('/', listReflectionsHandler(sql));
  router.patch('/:id', patchReflectionHandler(sql));
  return router;
}
