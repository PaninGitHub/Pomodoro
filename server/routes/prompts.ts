import { Router, type Request, type Response, type NextFunction } from 'express';
import type postgres from 'postgres';
import { requireAuth } from '../middleware/requireAuth';
import type { CustomPrompt } from '../types/db';

function getUserId(req: Request): string {
  return (req.user as { id: string }).id;
}

function listPromptsHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const rows = await sql<Pick<CustomPrompt, 'prompt_key' | 'prompt_text'>[]>`
        SELECT prompt_key, prompt_text FROM custom_prompts WHERE user_id = ${userId}
      `;
      const prompts: Record<string, string> = {};
      for (const r of rows) prompts[r.prompt_key] = r.prompt_text;
      res.status(200).json({ prompts });
    } catch (err) {
      next(err);
    }
  };
}

// patchPromptsHandler — Task 26.

export function buildPromptsRouter(sql: postgres.Sql): Router {
  const router = Router();
  router.use(requireAuth);
  router.get('/', listPromptsHandler(sql));
  // router.patch('/', patchPromptsHandler(sql)); // added in Task 26
  return router;
}
