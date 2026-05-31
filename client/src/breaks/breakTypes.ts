// Client-side shape for a break activity row. Mirrors the server's
// PublicBreakActivity (see server/types/db.ts) — id, name, time_estimate,
// sort_order. The server's user_id + created_at are not exposed to clients.

export interface ClientBreakActivity {
  id: string;
  name: string;
  time_estimate: number;
  sort_order: number;
}

// Constraints sourced from Batch D §12.6 + validateActivity.ts (server)
// and mirrored here so the form can pre-validate without a round-trip.
export const ACTIVITY_NAME_MAX = 64;
export const ACTIVITY_TIME_ESTIMATE_MIN = 1;
export const ACTIVITY_TIME_ESTIMATE_MAX = 1440;

// Client-side shape for a break_logs row. Mirrors the server's
// PublicBreakLog (server/types/db.ts). Date fields arrive as ISO strings
// over JSON — convert at the use-site when comparing as Date.
export interface ClientBreakLog {
  id: string;
  session_id: string;
  activity_id: string | null;
  activity_name: string | null;
  break_started_at: string;
  break_ended_at: string | null;
}
