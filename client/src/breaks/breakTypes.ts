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
