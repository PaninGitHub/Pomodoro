import { useMemo, useState } from 'react';
import { useReflectionsList } from './useReflectionsList';
import { useReflectionPrompts } from './useReflectionPrompts';
import { useSettings } from '../settings/useSettings';
import { groupByDay, groupByWeek, groupByMonth } from './grouping';
import {
  PER_PERIOD_KEYS,
  SESSION_KEYS,
  type PromptKey,
} from '../config/reflection-prompts.config';
import type { ReflectionFilters, ReflectionRow } from './reflectionTypes';

type View = 'day' | 'week' | 'month';

const inputCls =
  'px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary text-sm';

export function ReflectionLogPage(): JSX.Element {
  const { settings } = useSettings();
  const [filters, setFilters] = useState<ReflectionFilters>({});
  const [view, setView] = useState<View>('day');
  const { reflections, loading, error, refetch } = useReflectionsList(filters);

  const groups = useMemo(() => {
    if (view === 'week') return groupByWeek(reflections, settings.week_start);
    if (view === 'month') return groupByMonth(reflections);
    return groupByDay(reflections);
  }, [reflections, view, settings.week_start]);

  const hasActiveFilter =
    !!filters.from || !!filters.to || filters.focus_rating !== undefined || !!filters.task_name;

  function clearFilters() {
    setFilters({});
  }

  function updateFilter<K extends keyof ReflectionFilters>(key: K, value: ReflectionFilters[K]) {
    setFilters((prev) => {
      const next = { ...prev };
      if (value === undefined || value === '' || value === null) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-8 flex flex-col gap-6">
      <h2 className="text-2xl text-text-primary">Reflections</h2>

      <FilterBar
        filters={filters}
        hasActiveFilter={hasActiveFilter}
        view={view}
        onView={setView}
        onClear={clearFilters}
        onUpdate={updateFilter}
      />

      {loading && (
        <p className="text-sm text-text-secondary italic">Loading reflections…</p>
      )}

      {error && !loading && (
        <div className="border border-error rounded p-3 flex items-center justify-between gap-3">
          <span className="text-sm text-error">Could not load reflections: {error}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="px-3 py-1 text-sm rounded border border-border text-text-secondary hover:bg-bg-secondary"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && groups.length === 0 && (
        <p className="text-sm text-text-secondary italic">
          {hasActiveFilter
            ? 'No reflections match the current filters.'
            : 'No reflections yet. Start a Pomodoro and submit a reflection to see it here.'}
        </p>
      )}

      {groups.map((g) => (
        <section key={g.key} className="flex flex-col gap-3">
          <h3 className="text-sm uppercase tracking-widest text-text-secondary border-b border-border pb-1">
            {g.label}
          </h3>
          {g.items.map((r) => (
            <ReflectionCard key={r.id} reflection={r} />
          ))}
        </section>
      ))}
    </div>
  );
}

// ===========================================================================
// FilterBar
// ===========================================================================

interface FilterBarProps {
  filters: ReflectionFilters;
  hasActiveFilter: boolean;
  view: View;
  onView: (v: View) => void;
  onClear: () => void;
  onUpdate: <K extends keyof ReflectionFilters>(key: K, value: ReflectionFilters[K]) => void;
}

function FilterBar({
  filters,
  hasActiveFilter,
  view,
  onView,
  onClear,
  onUpdate,
}: FilterBarProps): JSX.Element {
  return (
    <div className="bg-bg-secondary/30 border border-border rounded p-3 flex flex-col gap-3">
      <div className="flex items-center gap-2 flex-wrap text-xs text-text-secondary">
        <span className="uppercase tracking-widest">Group by</span>
        {(['day', 'week', 'month'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onView(v)}
            aria-pressed={view === v}
            className={`px-3 py-1 rounded border text-xs uppercase tracking-widest ${
              view === v ? 'border-accent text-accent' : 'border-border text-text-secondary'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          From
          <input
            type="date"
            value={filters.from ?? ''}
            onChange={(e) => onUpdate('from', e.target.value || undefined)}
            className={inputCls}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          To
          <input
            type="date"
            value={filters.to ?? ''}
            onChange={(e) => onUpdate('to', e.target.value || undefined)}
            className={inputCls}
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          Focus
          <select
            value={filters.focus_rating ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              onUpdate('focus_rating', v === '' ? undefined : (Number(v) as 1 | 2 | 3 | 4));
            }}
            className={inputCls}
          >
            <option value="">Any</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-text-secondary flex-1 min-w-[180px]">
          Task contains
          <input
            type="text"
            value={filters.task_name ?? ''}
            onChange={(e) => onUpdate('task_name', e.target.value || undefined)}
            placeholder="e.g. read"
            className={`${inputCls} flex-1`}
          />
        </label>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-1 text-xs rounded border border-border text-text-secondary hover:bg-bg-secondary"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// ReflectionCard (read-only — C5 adds the Edit button)
// ===========================================================================

function ReflectionCard({ reflection }: { reflection: ReflectionRow }): JSX.Element {
  const { prompts } = useReflectionPrompts();
  const created = new Date(reflection.created_at);
  const time = created.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  const isSession = reflection.type === 'session';
  const accent = isSession ? 'border-l-4 border-accent' : 'border-l-2 border-text-secondary';
  const heading = isSession
    ? 'Session reflection'
    : `Period ${reflection.period_number ?? '?'} reflection`;

  const answers = reflection.answers ?? {};
  const orderedKeys = isSession ? SESSION_KEYS : PER_PERIOD_KEYS;
  const answered = orderedKeys.filter((k) => {
    const v = answers[k];
    if (v === undefined || v === null) return false;
    if (typeof v === 'string') return v.length > 0;
    if (Array.isArray(v)) return v.length > 0;
    return false;
  });

  return (
    <article className={`bg-bg-secondary/30 rounded p-4 flex flex-col gap-3 ${accent} pl-4`}>
      <header className="flex items-baseline justify-between gap-3 flex-wrap">
        <h4 className="text-text-primary font-semibold">{heading}</h4>
        <span className="text-xs text-text-secondary">{time}</span>
      </header>

      {reflection.focus_rating !== null && (
        <div className="text-sm text-text-secondary">
          Focus rating:{' '}
          <span className="text-accent font-semibold">{reflection.focus_rating}</span>
          /4
        </div>
      )}

      {reflection.tasks_snapshot && reflection.tasks_snapshot.length > 0 && (
        <div className="text-sm text-text-secondary">
          <div className="text-xs uppercase tracking-widest mb-1">Tasks</div>
          <ul className="flex flex-col gap-0.5 list-none p-0 m-0">
            {reflection.tasks_snapshot.map((t) => (
              <li key={t.task_id} className="flex items-center gap-2">
                <span className={t.is_complete ? 'line-through text-text-secondary' : 'text-text-primary'}>
                  {t.name}
                </span>
                {t.added_during_period && (
                  <span className="text-xs text-text-secondary">· added</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {answered.length > 0 && (
        <div className="flex flex-col gap-2">
          {answered.map((k) => (
            <AnswerBlock key={k} promptKey={k} value={answers[k]!} promptText={prompts[k]} />
          ))}
        </div>
      )}
    </article>
  );
}

function AnswerBlock({
  promptKey,
  value,
  promptText,
}: {
  promptKey: PromptKey;
  value: string | string[];
  promptText: string;
}): JSX.Element {
  return (
    <div className="flex flex-col">
      <span className="text-xs uppercase tracking-widest text-text-secondary">{promptText}</span>
      {Array.isArray(value) ? (
        <span className="text-sm text-text-primary">{value.join(', ')}</span>
      ) : (
        <span className="text-sm text-text-primary whitespace-pre-wrap">{value}</span>
      )}
      <span className="sr-only">(prompt key: {promptKey})</span>
    </div>
  );
}
