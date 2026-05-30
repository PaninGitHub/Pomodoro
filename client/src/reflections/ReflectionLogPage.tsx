import { useMemo, useState } from 'react';
import { useReflectionsList } from './useReflectionsList';
import { useReflectionPrompts } from './useReflectionPrompts';
import {
  PER_PERIOD_KEYS,
  SESSION_KEYS,
  type PromptKey,
} from '../config/reflection-prompts.config';
import type { ReflectionFilters, ReflectionRow } from './reflectionTypes';

// Group a flat reflections list by YYYY-MM-DD (local) for display.
// Returns an array of { dateKey, label, items } preserving newest-first
// ordering: the server already returns newest-first, so iteration order
// matches it.
interface DayGroup {
  dateKey: string;
  label: string;
  items: ReflectionRow[];
}
function groupByDay(rows: ReflectionRow[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const seen = new Map<string, DayGroup>();
  for (const r of rows) {
    const d = new Date(r.created_at);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    let group = seen.get(dateKey);
    if (!group) {
      const label = d.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      group = { dateKey, label, items: [] };
      seen.set(dateKey, group);
      groups.push(group);
    }
    group.items.push(r);
  }
  return groups;
}

export function ReflectionLogPage(): JSX.Element {
  // Filters live in local state; C4 will wire the filter bar UI to setFilters.
  // Empty object = "all reflections, newest first".
  const [filters] = useState<ReflectionFilters>({});
  const { reflections, loading, error, refetch } = useReflectionsList(filters);
  const groups = useMemo(() => groupByDay(reflections), [reflections]);

  return (
    <div className="w-full max-w-3xl mx-auto p-4 md:p-8 flex flex-col gap-6">
      <h2 className="text-2xl text-text-primary">Reflections</h2>

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
          No reflections yet. Start a Pomodoro and submit a reflection to see it here.
        </p>
      )}

      {groups.map((g) => (
        <section key={g.dateKey} className="flex flex-col gap-3">
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

// Inline card. C5's edit modal will live here on Edit click; the read-only
// shape is everything visible to the user in the list view.
function ReflectionCard({ reflection }: { reflection: ReflectionRow }): JSX.Element {
  const { prompts } = useReflectionPrompts();
  const created = new Date(reflection.created_at);
  const time = created.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

  // Per_period entries get a left-border accent; session entries get a
  // distinct heading + a thicker accent so they're visually distinct in
  // the list (per spec acceptance criterion).
  const isSession = reflection.type === 'session';
  const accent = isSession ? 'border-l-4 border-accent' : 'border-l-2 border-text-secondary';
  const heading = isSession
    ? 'Session reflection'
    : `Period ${reflection.period_number ?? '?'} reflection`;

  // Render only ANSWERED prompts — NULL/missing fields are omitted per spec.
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
