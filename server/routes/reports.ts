import { Router, type Request, type Response, type NextFunction } from 'express';
import type postgres from 'postgres';
import { requireAuth } from '../middleware/requireAuth';

function getUserId(req: Request): string {
  return (req.user as { id: string }).id;
}

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

// IANA tz validation runs against the runtime's tz database. Defaults to UTC
// when omitted — the frontend is expected to send the browser's resolved
// tz (Intl.DateTimeFormat().resolvedOptions().timeZone). Cap length to keep
// hostile payloads off the SQL planner.
function parseTz(raw: unknown): ParseResult<string> {
  if (raw === undefined || raw === '') return { ok: true, value: 'UTC' };
  if (typeof raw !== 'string') return { ok: false, error: 'tz must be a string.' };
  if (raw.length > 64) return { ok: false, error: 'tz must be 64 characters or fewer.' };
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: raw });
    return { ok: true, value: raw };
  } catch {
    return { ok: false, error: `Invalid IANA timezone: ${raw}.` };
  }
}

type Bucket = 'day' | 'week';

function parseBucket(raw: unknown): ParseResult<Bucket> {
  if (raw === undefined || raw === '') return { ok: true, value: 'day' };
  if (raw === 'day' || raw === 'week') return { ok: true, value: raw };
  return { ok: false, error: "bucket must be 'day' or 'week'." };
}

function parseIsoDate(raw: unknown): ParseResult<Date | null> {
  if (raw === undefined || raw === '') return { ok: true, value: null };
  if (typeof raw !== 'string') return { ok: false, error: 'date must be a string.' };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { ok: false, error: `Invalid ISO date: ${raw}.` };
  return { ok: true, value: d };
}

// PostgreSQL's date_trunc('week', ...) snaps to Monday 00:00 (ISO 8601).
// For Sunday-start users we shift the timestamp forward one day so Sunday
// rows truncate to Monday-as-Monday, then shift the result back to Sunday.
function bucketExprFor(sql: postgres.Sql, bucket: Bucket, tz: string, weekStart: 'sunday' | 'monday') {
  if (bucket === 'day') {
    return sql`(reflections.created_at AT TIME ZONE ${tz})::date`;
  }
  if (weekStart === 'monday') {
    return sql`(date_trunc('week', (reflections.created_at AT TIME ZONE ${tz})))::date`;
  }
  return sql`(date_trunc('week', (reflections.created_at AT TIME ZONE ${tz}) + interval '1 day') - interval '1 day')::date`;
}

function timeBucketExprFor(sql: postgres.Sql, bucket: Bucket, tz: string, weekStart: 'sunday' | 'monday') {
  if (bucket === 'day') {
    return sql`(timer_sessions.started_at AT TIME ZONE ${tz})::date`;
  }
  if (weekStart === 'monday') {
    return sql`(date_trunc('week', (timer_sessions.started_at AT TIME ZONE ${tz})))::date`;
  }
  return sql`(date_trunc('week', (timer_sessions.started_at AT TIME ZONE ${tz}) + interval '1 day') - interval '1 day')::date`;
}

async function readWeekStart(sql: postgres.Sql, userId: string): Promise<'sunday' | 'monday'> {
  const rows = await sql<{ week_start: 'sunday' | 'monday' }[]>`
    SELECT week_start FROM settings WHERE user_id = ${userId} LIMIT 1
  `;
  return rows[0]?.week_start ?? 'sunday';
}

const MAX_BUCKETS_PER_REQUEST = 500;

const MS_PER_DAY = 86_400_000;
function daysBetween(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / MS_PER_DAY);
}
function subDays(d: Date, n: number): Date {
  return new Date(d.getTime() - n * MS_PER_DAY);
}
function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function streakHandler(sql: postgres.Sql) {
  // F-28 Metric 1. Walks back from the most recent active calendar day in
  // user-local tz, counting consecutive days with periods_completed >= 1.
  // Freeze rule (spec line 1521): today with no session does NOT break the
  // streak — only a fully-elapsed local-midnight resets it. Translates to:
  // gap <= 1 keeps streak alive, gap >= 2 sets current to 0 while still
  // reporting the genuine last_active_date so the UI can show "restart" UX.
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const tzResult = parseTz(req.query.tz);
      if (!tzResult.ok) {
        res.status(400).json({ error: tzResult.error });
        return;
      }
      const tz = tzResult.value;

      const [todayRow] = await sql<{ today: Date }[]>`
        SELECT (NOW() AT TIME ZONE ${tz})::date AS today
      `;
      const today = todayRow!.today;

      const rows = await sql<{ active_date: Date }[]>`
        SELECT DISTINCT (started_at AT TIME ZONE ${tz})::date AS active_date
        FROM timer_sessions
        WHERE user_id = ${userId} AND periods_completed >= 1
        ORDER BY active_date DESC
      `;

      if (rows.length === 0) {
        res.status(200).json({ current: 0, last_active_date: null });
        return;
      }

      const last = rows[0]!.active_date;
      const lastIso = toIsoDate(last);
      const gap = daysBetween(today, last);

      if (gap >= 2) {
        res.status(200).json({ current: 0, last_active_date: lastIso });
        return;
      }

      let count = 1;
      let cursor = subDays(last, 1);
      for (let i = 1; i < rows.length; i++) {
        const d = rows[i]!.active_date;
        if (d.getTime() === cursor.getTime()) {
          count++;
          cursor = subDays(cursor, 1);
        } else {
          break;
        }
      }

      res.status(200).json({ current: count, last_active_date: lastIso });
    } catch (err) {
      next(err);
    }
  };
}

function focusHandler(sql: postgres.Sql) {
  // F-28 Metric 2. AVG(focus_rating) grouped per day or per week. Week
  // boundaries respect settings.week_start (Phase 3.5 added this; same
  // convention as client/src/reflections/grouping.ts). Reflections with
  // NULL focus_rating are excluded — they're per_period entries the user
  // skipped rating. Empty result → buckets: [], page renders the empty
  // state from spec line 1535.
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const tzResult = parseTz(req.query.tz);
      if (!tzResult.ok) {
        res.status(400).json({ error: tzResult.error });
        return;
      }
      const bucketResult = parseBucket(req.query.bucket);
      if (!bucketResult.ok) {
        res.status(400).json({ error: bucketResult.error });
        return;
      }
      const fromResult = parseIsoDate(req.query.from);
      if (!fromResult.ok) {
        res.status(400).json({ error: fromResult.error });
        return;
      }
      const toResult = parseIsoDate(req.query.to);
      if (!toResult.ok) {
        res.status(400).json({ error: toResult.error });
        return;
      }
      const tz = tzResult.value;
      const bucket = bucketResult.value;
      const fromDate = fromResult.value;
      const toDate = toResult.value;

      const weekStart = await readWeekStart(sql, userId);
      const bExpr = bucketExprFor(sql, bucket, tz, weekStart);

      const rows = await sql<{ start: Date; avg: number; n: number }[]>`
        SELECT
          ${bExpr} AS start,
          AVG(focus_rating)::float AS avg,
          COUNT(*)::int AS n
        FROM reflections
        WHERE user_id = ${userId} AND focus_rating IS NOT NULL
          ${fromDate ? sql`AND reflections.created_at >= ${fromDate}` : sql``}
          ${toDate ? sql`AND reflections.created_at <= ${toDate}` : sql``}
        GROUP BY 1
        ORDER BY 1 ASC
        LIMIT ${MAX_BUCKETS_PER_REQUEST}
      `;

      const buckets = rows.map((r) => ({
        start: toIsoDate(r.start),
        avg: r.avg,
        n: r.n,
      }));
      res.status(200).json({ buckets });
    } catch (err) {
      next(err);
    }
  };
}

function timeHandler(sql: postgres.Sql) {
  // F-28 Metric 3. SUM(total_work_mins) grouped per day or per week,
  // same bucketing convention as focusHandler. Excludes sessions where
  // total_work_mins is NULL (in-flight or interrupted sessions that the
  // client never PATCHed with a final figure). Display unit conversion
  // (minutes → "Xh Ym") happens on the client.
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = getUserId(req);
      const tzResult = parseTz(req.query.tz);
      if (!tzResult.ok) {
        res.status(400).json({ error: tzResult.error });
        return;
      }
      const bucketResult = parseBucket(req.query.bucket);
      if (!bucketResult.ok) {
        res.status(400).json({ error: bucketResult.error });
        return;
      }
      const fromResult = parseIsoDate(req.query.from);
      if (!fromResult.ok) {
        res.status(400).json({ error: fromResult.error });
        return;
      }
      const toResult = parseIsoDate(req.query.to);
      if (!toResult.ok) {
        res.status(400).json({ error: toResult.error });
        return;
      }
      const tz = tzResult.value;
      const bucket = bucketResult.value;
      const fromDate = fromResult.value;
      const toDate = toResult.value;

      const weekStart = await readWeekStart(sql, userId);
      const bExpr = timeBucketExprFor(sql, bucket, tz, weekStart);

      const rows = await sql<{ start: Date; total_mins: number }[]>`
        SELECT
          ${bExpr} AS start,
          SUM(total_work_mins)::int AS total_mins
        FROM timer_sessions
        WHERE user_id = ${userId} AND total_work_mins IS NOT NULL
          ${fromDate ? sql`AND timer_sessions.started_at >= ${fromDate}` : sql``}
          ${toDate ? sql`AND timer_sessions.started_at <= ${toDate}` : sql``}
        GROUP BY 1
        ORDER BY 1 ASC
        LIMIT ${MAX_BUCKETS_PER_REQUEST}
      `;

      const buckets = rows.map((r) => ({
        start: toIsoDate(r.start),
        total_mins: r.total_mins,
      }));
      res.status(200).json({ buckets });
    } catch (err) {
      next(err);
    }
  };
}

export function buildReportsRouter(sql: postgres.Sql): Router {
  const router = Router();
  router.use(requireAuth);
  router.get('/streak', streakHandler(sql));
  router.get('/focus', focusHandler(sql));
  router.get('/time', timeHandler(sql));
  return router;
}
