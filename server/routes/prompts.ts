import { Router, type Request, type Response, type NextFunction } from 'express';
import type postgres from 'postgres';
import { requireAuth } from '../middleware/requireAuth';
import { validatePromptUpdate } from '../utils/validatePromptUpdate';
import { ALL_PROMPT_KEYS, DEFAULT_PROMPTS } from '../config/reflectionPrompts';
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

function patchPromptsHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const v = validatePromptUpdate(req.body);
      if (!v.ok) {
        res.status(400).json({ error: v.error });
        return;
      }

      // Upsert in a single tx; tolerates fresh users whose seeds existed
      // (the row already exists -- UPDATE in place) and the pathological
      // case of a row that somehow doesn't exist (INSERT on conflict).
      await sql.begin(async (tx) => {
        for (const [key, text] of Object.entries(v.value.updates)) {
          await tx`
            INSERT INTO custom_prompts (user_id, prompt_key, prompt_text)
            VALUES (${userId}, ${key}, ${text!})
            ON CONFLICT (user_id, prompt_key)
            DO UPDATE SET prompt_text = EXCLUDED.prompt_text, updated_at = NOW()
          `;
        }
      });

      // Return the full map post-update.
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

function resetPromptsHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);

      // F-12: restore all 8 prompts to the config defaults in a single tx.
      // Implemented as a per-key upsert (rather than DELETE + INSERT) so
      // an interrupted reset can never leave a user with missing rows.
      await sql.begin(async (tx) => {
        for (const key of ALL_PROMPT_KEYS) {
          await tx`
            INSERT INTO custom_prompts (user_id, prompt_key, prompt_text)
            VALUES (${userId}, ${key}, ${DEFAULT_PROMPTS[key]})
            ON CONFLICT (user_id, prompt_key)
            DO UPDATE SET prompt_text = EXCLUDED.prompt_text, updated_at = NOW()
          `;
        }
      });

      // Return the full map so the client doesn't need a second GET.
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

export function buildPromptsRouter(sql: postgres.Sql): Router {
  const router = Router();
  router.use(requireAuth);
  router.get('/', listPromptsHandler(sql));
  router.patch('/', patchPromptsHandler(sql));
  router.post('/reset', resetPromptsHandler(sql));
  return router;
}
