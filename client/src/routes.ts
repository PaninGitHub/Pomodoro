// Single source of truth for client URLs + link helpers (Phase 5.5).
//
// Goal: no loose path strings scattered across components. All Link/navigate
// calls should go through these helpers so a future rename is one edit, not
// a grep-and-replace. Existing inline routes in router.tsx pre-date this
// pattern and stay as-is for now (legacy); new routes use these helpers.
//
// Type-narrowed param parsers (parseLogsTab) keep dynamic URL segments from
// crashing the app on bad input — invalid → safe fallback, never throw.

export const LOGS_TABS = ['break', 'reflections', 'reports'] as const;
export type LogsTab = (typeof LOGS_TABS)[number];

const LOGS_TABS_SET: ReadonlySet<string> = new Set<string>(LOGS_TABS);

export const DEFAULT_LOGS_TAB: LogsTab = 'reports';

// Type guard for runtime tab validation. Distinguishes "missing param"
// (bare /logs) from "invalid param" (/logs/garbage) so callers can fall
// back silently in the first case and redirect to self-correct in the
// second.
export function isLogsTab(raw: string | undefined): raw is LogsTab {
  return raw !== undefined && LOGS_TABS_SET.has(raw);
}

// Convenience: returns a valid LogsTab for the common "give me something
// safe" path. Used for the bare /logs case; for /logs/<invalid> callers
// should branch via isLogsTab + redirect instead.
export function parseLogsTab(raw: string | undefined, fallback: LogsTab = DEFAULT_LOGS_TAB): LogsTab {
  return isLogsTab(raw) ? raw : fallback;
}

// Link helpers — call these from components instead of writing path strings.
// Each helper returns a string so it can be passed to <Link to={…}> or
// navigate(...). Centralised here, easy to change later.
export const links = {
  home: (): string => '/',
  settings: (): string => '/settings',
  breakActivities: (): string => '/break-activities',
  logs: (tab?: LogsTab): string => (tab ? `/logs/${tab}` : '/logs'),
} as const;

// Route path patterns (for use in createBrowserRouter children). Separate
// from links because router patterns can include `:param` placeholders that
// links resolve at call time.
export const routePatterns = {
  logsTabbed: 'logs/:tab',
  logsIndex: 'logs',
} as const;
