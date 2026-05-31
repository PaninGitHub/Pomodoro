// Client-side mirror of server/routes/reports.ts response shapes — exact
// match on field names + types. Keep in sync when the server shape changes.

export type ReportBucket = 'day' | 'week';

export interface StreakResponse {
  current: number;
  last_active_date: string | null;  // ISO YYYY-MM-DD, null when no sessions
}

export interface FocusBucket {
  start: string;         // ISO YYYY-MM-DD — bucket start (day or week-of)
  avg: number;           // mean focus_rating in [1, 4]
  n: number;             // count of reflections in this bucket
}

export interface FocusReportResponse {
  buckets: FocusBucket[];
}

export interface TimeBucket {
  start: string;         // ISO YYYY-MM-DD — bucket start (day or week-of)
  total_mins: number;    // SUM(total_work_mins) in this bucket
}

export interface TimeReportResponse {
  buckets: TimeBucket[];
}
