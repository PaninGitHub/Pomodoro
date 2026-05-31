import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../auth/useAuth';
import { useStreak } from '../reports/useStreak';
import { useFocusReport } from '../reports/useFocusReport';
import { useTimeReport } from '../reports/useTimeReport';
import type { ReportBucket, StreakResponse, FocusReportResponse, TimeReportResponse } from '../reports/reportsTypes';

// Y-axis labels for the focus chart per spec line 1533:
// 1 = Not Focused, 2 = Somewhat Focused, 3 = Focused, 4 = Very Focused.
// Shortened "Somewhat" to fit the axis width without truncation on mobile.
const FOCUS_TICK_LABELS: Record<number, string> = {
  1: 'Not Focused',
  2: 'Somewhat',
  3: 'Focused',
  4: 'Very Focused',
};

function focusTickFormatter(v: number): string {
  return FOCUS_TICK_LABELS[v] ?? String(v);
}

// Spec line 1546: display in hours and minutes, e.g. "2h 35m".
function formatHm(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// Render the bucket start (YYYY-MM-DD) as a shorter axis tick. Tooltip
// still gets the full date so the user can disambiguate if needed.
function shortDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// =============================================================================
// Page entry — auth gate

export function ReportsPage(): JSX.Element {
  const { state: authState } = useAuth();

  if (authState.kind === 'loading') {
    return (
      <div className="w-full max-w-4xl mx-auto p-4 md:p-8">
        <p className="text-sm text-text-secondary italic">Loading…</p>
      </div>
    );
  }

  if (authState.kind !== 'signed_in') {
    // Defense-in-depth: F-28 Acceptance Criterion "hidden entirely for
    // guest users". AppLayout also conditionally hides the nav link, but
    // this guard means deep-linking /reports as a guest renders a
    // sign-in CTA instead of an empty page or 401 noise.
    return (
      <div className="w-full max-w-4xl mx-auto p-4 md:p-8 flex flex-col gap-4">
        <h2 className="text-2xl text-text-primary">Reports</h2>
        <p className="text-sm text-text-secondary">
          Reports are available once you sign in.
        </p>
      </div>
    );
  }

  return <ReportsPageInner />;
}

// =============================================================================
// Authenticated content

function ReportsPageInner(): JSX.Element {
  const [bucket, setBucket] = useState<ReportBucket>('day');
  const streak = useStreak();
  const focus = useFocusReport({ bucket });
  const time = useTimeReport({ bucket });

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 flex flex-col gap-6">
      <h2 className="text-2xl text-text-primary">Reports</h2>

      <StreakCard
        data={streak.data}
        loading={streak.loading}
        error={streak.error}
        onRetry={() => void streak.refetch()}
      />

      <BucketToggle value={bucket} onChange={setBucket} />

      <FocusCard
        data={focus.data}
        loading={focus.loading}
        error={focus.error}
        onRetry={() => void focus.refetch()}
        bucket={bucket}
      />

      <TimeCard
        data={time.data}
        loading={time.loading}
        error={time.error}
        onRetry={() => void time.refetch()}
        bucket={bucket}
      />
    </div>
  );
}

// =============================================================================
// Streak card

interface StreakCardProps {
  data: StreakResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function StreakCard({ data, loading, error, onRetry }: StreakCardProps): JSX.Element {
  if (loading && !data) {
    return (
      <section className="border border-border rounded p-6 flex flex-col items-center">
        <p className="text-sm text-text-secondary italic">Loading streak…</p>
      </section>
    );
  }
  if (error && !data) {
    return (
      <section className="border border-error rounded p-4 flex items-center justify-between gap-3">
        <span className="text-sm text-error">Could not load streak: {error}</span>
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1 text-sm rounded border border-border text-text-secondary hover:bg-bg-secondary"
        >
          Retry
        </button>
      </section>
    );
  }
  if (!data) return <></>;

  return (
    <section className="border border-border rounded p-6 flex flex-col items-center gap-2">
      <div className="text-6xl text-text-primary tabular-nums leading-none">
        {data.current}
      </div>
      <div className="text-sm uppercase tracking-widest text-text-secondary">
        Day Streak
      </div>
      {data.current === 0 && data.last_active_date && (
        <p className="text-xs text-text-secondary mt-1 text-center">
          Last active: {data.last_active_date}. Complete a Pomodoro today to start a new streak.
        </p>
      )}
      {data.current === 0 && !data.last_active_date && (
        <p className="text-xs text-text-secondary mt-1 text-center">
          Complete your first Pomodoro to start a streak.
        </p>
      )}
    </section>
  );
}

// =============================================================================
// Daily / Weekly toggle

interface BucketToggleProps {
  value: ReportBucket;
  onChange: (v: ReportBucket) => void;
}

function BucketToggle({ value, onChange }: BucketToggleProps): JSX.Element {
  return (
    <div className="flex gap-2" role="tablist" aria-label="Aggregation interval">
      {(['day', 'week'] as const).map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(opt)}
            className={`px-3 py-1 text-sm rounded border ${
              selected
                ? 'border-accent text-text-primary'
                : 'border-border text-text-secondary hover:text-text-primary'
            }`}
          >
            {opt === 'day' ? 'Daily' : 'Weekly'}
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// Focus chart card

interface FocusCardProps {
  data: FocusReportResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  bucket: ReportBucket;
}

function FocusCard({ data, loading, error, onRetry, bucket }: FocusCardProps): JSX.Element {
  const heading = `Average Focus (${bucket === 'day' ? 'Daily' : 'Weekly'})`;

  if (loading && !data) {
    return (
      <ChartCard heading={heading}>
        <p className="text-sm text-text-secondary italic">Loading…</p>
      </ChartCard>
    );
  }
  if (error && !data) {
    return (
      <ChartCard heading={heading}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-error">Could not load focus data: {error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1 text-sm rounded border border-border text-text-secondary hover:bg-bg-secondary"
          >
            Retry
          </button>
        </div>
      </ChartCard>
    );
  }
  if (!data || data.buckets.length === 0) {
    return (
      <ChartCard heading={heading}>
        <p className="text-sm text-text-secondary italic">
          No focus data yet. Complete a session with reflection enabled to see your ratings.
        </p>
      </ChartCard>
    );
  }

  const chartData = data.buckets.map((b) => ({ ...b, startLabel: shortDate(b.start) }));

  return (
    <ChartCard heading={heading}>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="#2e2e2e" strokeDasharray="3 3" />
          <XAxis dataKey="startLabel" stroke="#ebebeb" tick={{ fontSize: 11 }} />
          <YAxis
            domain={[1, 4]}
            ticks={[1, 2, 3, 4]}
            tickFormatter={focusTickFormatter}
            stroke="#ebebeb"
            tick={{ fontSize: 11 }}
            width={110}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#141414', border: '1px solid #2e2e2e' }}
            labelStyle={{ color: '#f5f5f5' }}
            itemStyle={{ color: '#f5f5f5' }}
            formatter={(value) => [
              typeof value === 'number' ? value.toFixed(2) : String(value),
              'Avg focus',
            ]}
          />
          <Line
            type="monotone"
            dataKey="avg"
            stroke="#d4a017"
            strokeWidth={2}
            dot={{ r: 3, fill: '#d4a017' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// =============================================================================
// Time chart card

interface TimeCardProps {
  data: TimeReportResponse | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  bucket: ReportBucket;
}

function TimeCard({ data, loading, error, onRetry, bucket }: TimeCardProps): JSX.Element {
  const heading = `Focused Time (${bucket === 'day' ? 'Daily' : 'Weekly'})`;

  if (loading && !data) {
    return (
      <ChartCard heading={heading}>
        <p className="text-sm text-text-secondary italic">Loading…</p>
      </ChartCard>
    );
  }
  if (error && !data) {
    return (
      <ChartCard heading={heading}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-error">Could not load time data: {error}</span>
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1 text-sm rounded border border-border text-text-secondary hover:bg-bg-secondary"
          >
            Retry
          </button>
        </div>
      </ChartCard>
    );
  }
  if (!data || data.buckets.length === 0) {
    return (
      <ChartCard heading={heading}>
        <p className="text-sm text-text-secondary italic">No sessions recorded yet.</p>
      </ChartCard>
    );
  }

  const chartData = data.buckets.map((b) => ({ ...b, startLabel: shortDate(b.start) }));
  const total = data.buckets.reduce((sum, b) => sum + b.total_mins, 0);

  return (
    <ChartCard heading={heading}>
      <p className="text-xs text-text-secondary">
        Total this view: <span className="text-text-primary tabular-nums">{formatHm(total)}</span>
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="#2e2e2e" strokeDasharray="3 3" />
          <XAxis dataKey="startLabel" stroke="#ebebeb" tick={{ fontSize: 11 }} />
          <YAxis
            stroke="#ebebeb"
            tick={{ fontSize: 11 }}
            tickFormatter={formatHm}
            width={60}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#141414', border: '1px solid #2e2e2e' }}
            labelStyle={{ color: '#f5f5f5' }}
            itemStyle={{ color: '#f5f5f5' }}
            formatter={(value) => [
              typeof value === 'number' ? formatHm(value) : String(value),
              'Focused time',
            ]}
          />
          <Bar dataKey="total_mins" fill="#4caf82" />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// =============================================================================
// Shared chart card wrapper

interface ChartCardProps {
  heading: string;
  children: React.ReactNode;
}

function ChartCard({ heading, children }: ChartCardProps): JSX.Element {
  return (
    <section className="border border-border rounded p-4 flex flex-col gap-3">
      <h3 className="text-sm uppercase tracking-widest text-text-secondary">{heading}</h3>
      {children}
    </section>
  );
}
