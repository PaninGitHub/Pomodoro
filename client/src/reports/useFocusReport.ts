import { useBrowserTz, useReportsFetch, type ReportsFetchResult } from './useReportsFetch';
import type { FocusReportResponse, ReportBucket } from './reportsTypes';

interface Args {
  bucket: ReportBucket;
}

// F-28 Metric 2 fetcher. Bucket flips when the user toggles daily/weekly
// on the page; the fetch core's cancellation guard prevents a slow stale
// fetch from clobbering the newer one.
export function useFocusReport({ bucket }: Args): ReportsFetchResult<FocusReportResponse> {
  const tz = useBrowserTz();
  const url = `/api/reports/focus?bucket=${bucket}&tz=${encodeURIComponent(tz)}`;
  return useReportsFetch<FocusReportResponse>(url, 'useFocusReport');
}
