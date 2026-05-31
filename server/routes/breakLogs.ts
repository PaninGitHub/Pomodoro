// Break logs router (F-17 emits, F-18 reads).
//
// POST creates a row when the F-17 popup is resolved (selected an activity
// OR dismissed without selecting). PATCH closes the row by stamping
// break_ended_at when the break period ends. GET powers the F-18 log
// viewer with optional from / to filters.
//
// Ownership: session_id (and activity_id when present) MUST belong to the
// authenticated user. The DB FKs only enforce existence + delete cascade,
// not who-owns-what, so each handler explicitly checks. Pattern mirrors
// reflections.ts.

import { Router, type Request, type Response, type NextFunction } from 'express';
import type postgres from 'postgres';
import { requireAuth } from '../middleware/requireAuth';
import { parseUuid } from '../utils/parseUuid';
import { validateCreateBreakLog, validatePatchBreakLog } from '../utils/validateBreakLog';
import type { PublicBreakLog } from '../types/db';

// Cap on the GET response to keep payloads bounded. Mirrors the 500-row
// cap in reflections.ts listHandler.
const MAX_LIST_ROWS = 500;

function getUserId(req: Request): string {
  return (req.user as { id: string }).id;
}

function listBreakLogsHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const { from, to } = req.query as { from?: string; to?: string };

      let fromDate: Date | null = null;
      let toDate: Date | null = null;
      if (from !== undefined) {
        const d = new Date(from);
        if (Number.isNaN(d.getTime())) {
          res.status(400).json({ error: 'from must be an ISO date string.' });
          return;
        }
        fromDate = d;
      }
      if (to !== undefined) {
        const d = new Date(to);
        if (Number.isNaN(d.getTime())) {
          res.status(400).json({ error: 'to must be an ISO date string.' });
          return;
        }
        toDate = d;
      }

      const rows = await sql<PublicBreakLog[]>`
        SELECT id, session_id, activity_id, activity_name, break_started_at, break_ended_at
        FROM break_logs
        WHERE user_id = ${userId}
          ${fromDate !== null ? sql`AND break_started_at >= ${fromDate}` : sql``}
          ${toDate !== null ? sql`AND break_started_at <= ${toDate}` : sql``}
        ORDER BY break_started_at DESC
        LIMIT ${MAX_LIST_ROWS}
      `;
      res.status(200).json({ break_logs: rows });
    } catch (err) {
      next(err);
    }
  };
}

function createBreakLogHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const v = validateCreateBreakLog(req.body);
      if (!v.ok) {
        res.status(400).json({ error: v.error });
        return;
      }
      const { session_id, activity_id, activity_name, break_started_at } = v.value;

      // Session ownership check. FK only enforces existence; we enforce
      // the user owns the session before letting them log a break against it.
      const sessRows = await sql`
        SELECT 1 FROM timer_sessions WHERE id = ${session_id} AND user_id = ${userId}
      `;
      if (sessRows.length === 0) {
        res.status(404).json({ error: 'Session not found.' });
        return;
      }

      // Activity ownership check (only when activity_id is provided).
      if (activity_id !== null) {
        const actRows = await sql`
          SELECT 1 FROM break_activities WHERE id = ${activity_id} AND user_id = ${userId}
        `;
        if (actRows.length === 0) {
          res.status(404).json({ error: 'Break activity not found.' });
          return;
        }
      }

      const [log] = await sql<PublicBreakLog[]>`
        INSERT INTO break_logs (user_id, session_id, activity_id, activity_name, break_started_at)
        VALUES (${userId}, ${session_id}, ${activity_id}, ${activity_name}, ${break_started_at})
        RETURNING id, session_id, activity_id, activity_name, break_started_at, break_ended_at
      `;
      res.status(201).json({ break_log: log });
    } catch (err) {
      next(err);
    }
  };
}

function patchBreakLogHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const idResult = parseUuid(req.params.id);
      if (!idResult.ok) {
        res.status(400).json({ error: 'Invalid break log ID.' });
        return;
      }
      const v = validatePatchBreakLog(req.body);
      if (!v.ok) {
        res.status(400).json({ error: v.error });
        return;
      }

      const updated = await sql<PublicBreakLog[]>`
        UPDATE break_logs
        SET break_ended_at = ${v.value.break_ended_at}
        WHERE id = ${idResult.value} AND user_id = ${userId}
        RETURNING id, session_id, activity_id, activity_name, break_started_at, break_ended_at
      `;
      if (updated.length === 0) {
        res.status(404).json({ error: 'Break log not found.' });
        return;
      }
      res.status(200).json({ break_log: updated[0] });
    } catch (err) {
      next(err);
    }
  };
}

export function buildBreakLogsRouter(sql: postgres.Sql): Router {
  const router = Router();
  router.use(requireAuth);
  router.get('/', listBreakLogsHandler(sql));
  router.post('/', createBreakLogHandler(sql));
  router.patch('/:id', patchBreakLogHandler(sql));
  return router;
}
