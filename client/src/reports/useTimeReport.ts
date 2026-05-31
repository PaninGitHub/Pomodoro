import { useBrowserTz, useReportsFetch, type ReportsFetchResult } from './useReportsFetch';
import type { ReportBucket, TimeReportResponse } from './reportsTypes';

interface Args {
  bucket: ReportBucket;
}

// F-28 Metric 3 fetcher. Parallel to useFocusReport — separate hook so
// the page can render the focus + time cards independently (each one has
// its own loading / error / empty state).
export function useTimeReport({ bucket }: Args): ReportsFetchResult<TimeReportResponse> {
  const tz = useBrowserTz();
  const url = `/api/reports/time?bucket=${bucket}&tz=${encodeURIComponent(tz)}`;
  return useReportsFetch<TimeReportResponse>(url, 'useTimeReport');
}
