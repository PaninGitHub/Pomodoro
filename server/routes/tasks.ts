import { Router, type Request, type Response, type NextFunction } from 'express';
import type postgres from 'postgres';
import { requireAuth } from '../middleware/requireAuth';
import { parseUuid } from '../utils/parseUuid';
import { validateCreateTask, validateUpdateTask, validateReorderIds } from '../utils/validateTask';
import type { PublicTask } from '../types/db';

const MAX_TASKS = 20;

function getUserId(req: Request): string {
  return (req.user as { id: string }).id;
}

function selectPublic(): string {
  return 'id, name, time_estimate, is_complete, sort_order';
}

function listTasksHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const rows = await sql<PublicTask[]>`
        SELECT id, name, time_estimate, is_complete, sort_order
        FROM tasks WHERE user_id = ${userId}
        ORDER BY sort_order ASC
      `;
      res.status(200).json({ tasks: rows });
    } catch (err) {
      next(err);
    }
  };
}

function createTaskHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const v = validateCreateTask(req.body);
      if (!v.ok) {
        res.status(400).json({ error: v.error });
        return;
      }
      // One query: count for limit check + next sort_order. Saves a round-trip
      // (Phase 2 mid-fix: noticeable add-task delay was 2 sequential queries
      // before INSERT plus a non-optimistic client wait).
      const [stat] = await sql<{ n: number; next: number }[]>`
        SELECT COUNT(*)::int AS n,
               COALESCE(MAX(sort_order) + 1, 0)::int AS next
        FROM tasks WHERE user_id = ${userId}
      `;
      if ((stat?.n ?? 0) >= MAX_TASKS) {
        res.status(400).json({ error: `You've reached the maximum of ${MAX_TASKS} tasks.` });
        return;
      }
      const next = stat?.next ?? 0;
      const [task] = await sql<PublicTask[]>`
        INSERT INTO tasks (user_id, name, time_estimate, sort_order)
        VALUES (${userId}, ${v.value.name}, ${v.value.time_estimate}, ${next})
        RETURNING id, name, time_estimate, is_complete, sort_order
      `;
      res.status(201).json({ task });
    } catch (err) {
      next(err);
    }
  };
}

function updateTaskHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const idResult = parseUuid(req.params.id);
      if (!idResult.ok) {
        res.status(400).json({ error: 'Invalid task ID.' });
        return;
      }
      const v = validateUpdateTask(req.body);
      if (!v.ok) {
        res.status(400).json({ error: v.error });
        return;
      }

      // Build the SET clause dynamically; postgres.js sql() helper accepts an
      // object for partial updates.
      const fields = { ...v.value, updated_at: new Date() };
      const updated = await sql<PublicTask[]>`
        UPDATE tasks SET ${sql(fields)}
        WHERE id = ${idResult.value} AND user_id = ${userId}
        RETURNING id, name, time_estimate, is_complete, sort_order
      `;
      if (updated.length === 0) {
        res.status(404).json({ error: 'Task not found.' });
        return;
      }
      res.status(200).json({ task: updated[0] });
    } catch (err) {
      next(err);
    }
  };
}

function reorderTasksHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const v = validateReorderIds((req.body as { ordered_ids?: unknown })?.ordered_ids);
      if (!v.ok) {
        res.status(400).json({ error: v.error });
        return;
      }
      // Each ID must be a valid UUID
      const parsedIds: string[] = [];
      for (const raw of v.value) {
        const p = parseUuid(raw);
        if (!p.ok) {
          res.status(400).json({ error: 'ordered_ids contains an invalid UUID.' });
          return;
        }
        parsedIds.push(p.value);
      }

      // Transactional reorder: every UPDATE must affect exactly one row.
      try {
        await sql.begin(async (tx) => {
          for (let i = 0; i < parsedIds.length; i++) {
            const id = parsedIds[i]!;
            const result = await tx`
              UPDATE tasks SET sort_order = ${i}, updated_at = NOW()
              WHERE id = ${id} AND user_id = ${userId}
            `;
            // postgres.js returns the affected count via .count
            if ((result as unknown as { count: number }).count !== 1) {
              throw new Error('TASK_NOT_FOUND');
            }
          }
        });
      } catch (innerErr) {
        if (innerErr instanceof Error && innerErr.message === 'TASK_NOT_FOUND') {
          res.status(404).json({ error: 'One or more tasks could not be found.' });
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

function deleteAllTasksHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const result = await sql`DELETE FROM tasks WHERE user_id = ${userId}`;
      const count = (result as unknown as { count: number }).count;
      res.status(200).json({ ok: true, deleted: count });
    } catch (err) {
      next(err);
    }
  };
}

function deleteTaskHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const idResult = parseUuid(req.params.id);
      if (!idResult.ok) {
        res.status(400).json({ error: 'Invalid task ID.' });
        return;
      }
      const result = await sql`
        DELETE FROM tasks WHERE id = ${idResult.value} AND user_id = ${userId}
      `;
      if ((result as unknown as { count: number }).count === 0) {
        res.status(404).json({ error: 'Task not found.' });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  };
}

export function buildTasksRouter(sql: postgres.Sql): Router {
  const router = Router();
  router.use(requireAuth);
  router.get('/', listTasksHandler(sql));
  router.post('/', createTaskHandler(sql));
  router.patch('/reorder', reorderTasksHandler(sql)); // must come before /:id
  router.patch('/:id', updateTaskHandler(sql));
  router.delete('/', deleteAllTasksHandler(sql));     // clear all (must come before /:id)
  router.delete('/:id', deleteTaskHandler(sql));
  return router;
}
