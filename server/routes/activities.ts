// Break activities CRUD router (F-16).
// Mirrors server/routes/tasks.ts conventions intentionally:
//   - Same auth-then-handler factory pattern
//   - Same Result-shaped validator outputs
//   - PATCH /reorder ROUTE-MOUNTED BEFORE PATCH /:id (Express precedence)
//   - sort_order computed server-side on INSERT
// Differences vs tasks: per-user limit comes from settings.break_activity_limit
// (1-30) rather than a hardcoded constant.

import { Router, type Request, type Response, type NextFunction } from 'express';
import type postgres from 'postgres';
import { requireAuth } from '../middleware/requireAuth';
import { parseUuid } from '../utils/parseUuid';
import { validateCreateActivity, validateUpdateActivity } from '../utils/validateActivity';
import { validateReorderIds } from '../utils/validateTask';
import type { PublicBreakActivity } from '../types/db';

// Fallback if the user has no settings row yet. Matches the schema default
// in migration 007 (break_activity_limit DEFAULT 10).
const DEFAULT_LIMIT = 10;

function getUserId(req: Request): string {
  return (req.user as { id: string }).id;
}

function listActivitiesHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const rows = await sql<PublicBreakActivity[]>`
        SELECT id, name, time_estimate, sort_order
        FROM break_activities WHERE user_id = ${userId}
        ORDER BY sort_order ASC
      `;
      res.status(200).json({ activities: rows });
    } catch (err) {
      next(err);
    }
  };
}

function createActivityHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const v = validateCreateActivity(req.body);
      if (!v.ok) {
        res.status(400).json({ error: v.error });
        return;
      }
      // Single round-trip for count + next sort_order + per-user limit.
      // Mirrors the perf optimization in tasks.ts createTaskHandler.
      const [stat] = await sql<{ n: number; next: number; limit: number | null }[]>`
        SELECT
          (SELECT COUNT(*)::int FROM break_activities WHERE user_id = ${userId}) AS n,
          (SELECT COALESCE(MAX(sort_order) + 1, 0)::int FROM break_activities WHERE user_id = ${userId}) AS next,
          (SELECT break_activity_limit FROM settings WHERE user_id = ${userId}) AS "limit"
      `;
      const count = stat?.n ?? 0;
      const next = stat?.next ?? 0;
      const limit = stat?.limit ?? DEFAULT_LIMIT;

      if (count >= limit) {
        res.status(400).json({ error: `You've reached the maximum of ${limit} break activities.` });
        return;
      }

      const [activity] = await sql<PublicBreakActivity[]>`
        INSERT INTO break_activities (user_id, name, time_estimate, sort_order)
        VALUES (${userId}, ${v.value.name}, ${v.value.time_estimate}, ${next})
        RETURNING id, name, time_estimate, sort_order
      `;
      res.status(201).json({ activity });
    } catch (err) {
      next(err);
    }
  };
}

function updateActivityHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const idResult = parseUuid(req.params.id);
      if (!idResult.ok) {
        res.status(400).json({ error: 'Invalid activity ID.' });
        return;
      }
      const v = validateUpdateActivity(req.body);
      if (!v.ok) {
        res.status(400).json({ error: v.error });
        return;
      }

      // sql() object helper renders a SET clause from a plain object.
      const updated = await sql<PublicBreakActivity[]>`
        UPDATE break_activities SET ${sql(v.value as Record<string, unknown>)}
        WHERE id = ${idResult.value} AND user_id = ${userId}
        RETURNING id, name, time_estimate, sort_order
      `;
      if (updated.length === 0) {
        res.status(404).json({ error: 'Break activity not found.' });
        return;
      }
      res.status(200).json({ activity: updated[0] });
    } catch (err) {
      next(err);
    }
  };
}

function reorderActivitiesHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const v = validateReorderIds((req.body as { ordered_ids?: unknown })?.ordered_ids);
      if (!v.ok) {
        res.status(400).json({ error: v.error });
        return;
      }
      const parsedIds: string[] = [];
      for (const raw of v.value) {
        const p = parseUuid(raw);
        if (!p.ok) {
          res.status(400).json({ error: 'ordered_ids contains an invalid UUID.' });
          return;
        }
        parsedIds.push(p.value);
      }

      // Transactional reorder. Every UPDATE must affect exactly one row;
      // a 0-row hit means the id either doesn't exist or belongs to
      // another user. Throw to roll the tx back.
      try {
        await sql.begin(async (tx) => {
          for (let i = 0; i < parsedIds.length; i++) {
            const id = parsedIds[i]!;
            const result = await tx`
              UPDATE break_activities SET sort_order = ${i}
              WHERE id = ${id} AND user_id = ${userId}
            `;
            if ((result as unknown as { count: number }).count !== 1) {
              throw new Error('ACTIVITY_NOT_FOUND');
            }
          }
        });
      } catch (innerErr) {
        if (innerErr instanceof Error && innerErr.message === 'ACTIVITY_NOT_FOUND') {
          res.status(404).json({ error: 'One or more break activities could not be found.' });
          return;
        }
        throw innerErr;
      }

      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  };
}

function deleteActivityHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const idResult = parseUuid(req.params.id);
      if (!idResult.ok) {
        res.status(400).json({ error: 'Invalid activity ID.' });
        return;
      }
      const result = await sql`
        DELETE FROM break_activities WHERE id = ${idResult.value} AND user_id = ${userId}
      `;
      if ((result as unknown as { count: number }).count === 0) {
        res.status(404).json({ error: 'Break activity not found.' });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  };
}

export function buildActivitiesRouter(sql: postgres.Sql): Router {
  const router = Router();
  router.use(requireAuth);
  router.get('/', listActivitiesHandler(sql));
  router.post('/', createActivityHandler(sql));
  router.patch('/reorder', reorderActivitiesHandler(sql)); // MUST come before /:id
  router.patch('/:id', updateActivityHandler(sql));
  router.delete('/:id', deleteActivityHandler(sql));
  return router;
}
