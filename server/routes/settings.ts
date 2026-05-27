import { Router, type Request, type Response, type NextFunction } from 'express';
import type postgres from 'postgres';
import { requireAuth } from '../middleware/requireAuth';
import { validatePartialSettings } from '../utils/validateSettings';
import type { PublicSettings } from '../types/db';

const PUBLIC_COLUMNS = `
  work_duration, short_break_duration, long_break_duration, long_break_frequency,
  auto_start_breaks, auto_start_pomodoros, freestyle_ratio, freestyle_accumulate,
  alarm_sound, alarm_volume, alarm_repeats, alarm_custom_url, browser_notifications,
  reflection_enabled, music_autoplay, music_volume, last_sound_selected,
  break_activity_limit, theme, font, hour_format
`;

function getUserId(req: Request): string {
  return (req.user as { id: string }).id;
}

function getSettingsHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      let rows = await sql<PublicSettings[]>`
        SELECT work_duration, short_break_duration, long_break_duration, long_break_frequency,
               auto_start_breaks, auto_start_pomodoros, freestyle_ratio, freestyle_accumulate,
               alarm_sound, alarm_volume, alarm_repeats, alarm_custom_url, browser_notifications,
               reflection_enabled, music_autoplay, music_volume, last_sound_selected,
               break_activity_limit, theme, font, hour_format
        FROM settings WHERE user_id = ${userId}
      `;
      if (rows.length === 0) {
        // Lazy-create: settings should exist (upsertUser seeds), but be defensive.
        await sql`INSERT INTO settings (user_id) VALUES (${userId}) ON CONFLICT (user_id) DO NOTHING`;
        rows = await sql<PublicSettings[]>`
          SELECT work_duration, short_break_duration, long_break_duration, long_break_frequency,
                 auto_start_breaks, auto_start_pomodoros, freestyle_ratio, freestyle_accumulate,
                 alarm_sound, alarm_volume, alarm_repeats, alarm_custom_url, browser_notifications,
                 reflection_enabled, music_autoplay, music_volume, last_sound_selected,
                 break_activity_limit, theme, font, hour_format
          FROM settings WHERE user_id = ${userId}
        `;
      }
      res.status(200).json({ settings: rows[0] });
    } catch (err) {
      next(err);
    }
  };
}

function patchSettingsHandler(sql: postgres.Sql) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const v = validatePartialSettings(req.body);
      if (!v.ok) {
        res.status(400).json({ error: v.error });
        return;
      }
      // postgres.js sql() accepts a plain object for partial UPDATE.
      // freestyle_ratio comes back from postgres.js NUMERIC(5,2) as a string;
      // we cast explicitly for the response shape.
      const fields = { ...v.value, updated_at: new Date() };
      await sql`
        UPDATE settings SET ${sql(fields)} WHERE user_id = ${userId}
      `;
      const rows = await sql<PublicSettings[]>`
        SELECT work_duration, short_break_duration, long_break_duration, long_break_frequency,
               auto_start_breaks, auto_start_pomodoros, freestyle_ratio, freestyle_accumulate,
               alarm_sound, alarm_volume, alarm_repeats, alarm_custom_url, browser_notifications,
               reflection_enabled, music_autoplay, music_volume, last_sound_selected,
               break_activity_limit, theme, font, hour_format
        FROM settings WHERE user_id = ${userId}
      `;
      res.status(200).json({ settings: rows[0] });
    } catch (err) {
      next(err);
    }
  };
}

export function buildSettingsRouter(sql: postgres.Sql): Router {
  const router = Router();
  router.use(requireAuth);
  router.get('/', getSettingsHandler(sql));
  router.patch('/', patchSettingsHandler(sql));
  return router;
}
