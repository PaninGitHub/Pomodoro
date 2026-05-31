import { useBrowserTz, useReportsFetch, type ReportsFetchResult } from './useReportsFetch';
import type { StreakResponse } from './reportsTypes';

// F-28 Metric 1 fetcher. Browser tz is sent so day-bucket boundaries
// align with the user's local clock.
export function useStreak(): ReportsFetchResult<StreakResponse> {
  const tz = useBrowserTz();
  const url = `/api/reports/streak?tz=${encodeURIComponent(tz)}`;
  return useReportsFetch<StreakResponse>(url, 'useStreak');
}
