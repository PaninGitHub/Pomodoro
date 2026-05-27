import { Router, type Request, type Response, type NextFunction } from 'express';
import type postgres from 'postgres';
import { requireAuth } from '../middleware/requireAuth';
import { log } from '../utils/logger';

function getUserId(req: Request): string {
  return (req.user as { id: string }).id;
}

function deleteUserHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = getUserId(req);
    try {
      // 1. Delete the user. FK ON DELETE CASCADE wipes settings, tasks, session rows.
      const result = await sql`DELETE FROM users WHERE id = ${userId} RETURNING id`;
      if (result.length === 0) {
        res.status(404).json({ error: 'Account not found.' });
        return;
      }

      // 2. Destroy server-side session. Warn on failure but don't bubble —
      //    the cascade already removed the session row; we still need to clear
      //    the cookie below.
      await new Promise<void>((resolve) => {
        req.session.destroy((err) => {
          if (err) {
            log({
              level: 'warn',
              event: 'session_destroy_after_delete_failed',
              user_id: userId,
              message: err.message,
            });
          }
          resolve();
        });
      });

      // 3. Clear the cookie so the browser doesn't hold a stale session ID.
      res.clearCookie('connect.sid');

      // 4. Respond.
      log({ level: 'info', event: 'account_deleted', user_id: userId });
      res.status(200).json({ ok: true });
    } catch (err) {
      // Any DB error during the DELETE propagates to the error middleware.
      next(err);
    }
  };
}

export function buildUserRouter(sql: postgres.Sql): Router {
  const router = Router();
  router.use(requireAuth);
  router.delete('/', deleteUserHandler(sql));
  return router;
}
