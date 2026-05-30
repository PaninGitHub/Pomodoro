import { useState, type ReactNode } from 'react';
import { useTimer } from '../timer/state/useTimer';
import { useReflectionPrompts } from './useReflectionPrompts';
import { HINDRANCE_OPTIONS, FREE_TEXT_MAX } from '../config/reflection-prompts.config';
import { TaskReviewSections } from './TaskReviewSections';

type FocusRating = 1 | 2 | 3 | 4;

export function ReflectionModal(): JSX.Element | null {
  const { state, dispatch } = useTimer();
  const { prompts } = useReflectionPrompts();

  // Per-period reflection state. Session variant lands in Task 35.
  const [focusRating, setFocusRating] = useState<FocusRating | null>(null);
  const [hindrances, setHindrances] = useState<string[]>([]);
  const [didWell, setDidWell] = useState('');
  const [doBetter, setDoBetter] = useState('');
  const [hindranceDetail, setHindranceDetail] = useState('');
  const [taskStructure, setTaskStructure] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (state.status !== 'reflecting' || state.reflectionType !== 'per_period') return null;

  const snapshot = state.currentPeriodTasksSnapshot ?? [];
  const showHindrances = focusRating !== null && focusRating <= 2;

  function toggleHindrance(opt: string) {
    setHindrances((prev) => (prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]));
  }

  function skip() {
    dispatch({ type: 'REFLECTION_SKIPPED' });
  }

  async function submit() {
    if (submitting) return;

    // Build the answers payload from non-empty fields. Empty strings are
    // treated as "skipped" and omitted so the server-side known-key
    // whitelist doesn't reject them and the JSONB stays compact.
    const answers: Record<string, string | string[]> = {};
    if (didWell) answers.did_well = didWell;
    if (doBetter) answers.do_better = doBetter;
    if (showHindrances && hindrances.length > 0) {
      answers.hindrance_options = hindrances;
      if (hindrances.includes('Distractions') && hindranceDetail) {
        answers.hindrance_detail = hindranceDetail;
      }
      if (hindrances.includes('Unclear Tasks') && taskStructure) {
        answers.task_structure_note = taskStructure;
      }
    }

    // Fully-skipped body (no rating, no answers) -> no DB write per F-07.
    const hasAnyAnswer = focusRating !== null || Object.keys(answers).length > 0;
    if (!hasAnyAnswer) {
      dispatch({ type: 'REFLECTION_SKIPPED' });
      return;
    }

    // Guests don't have a currentSessionId; reflections are auth-only per
    // F-22. If somehow we got here without one, skip the POST and resolve
    // locally so we don't 400 / 401 on the server.
    if (!state.currentSessionId) {
      dispatch({ type: 'REFLECTION_SUBMITTED' });
      return;
    }

    setSubmitting(true);
    try {
      await fetch('/api/reflections', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: state.currentSessionId,
          type: 'per_period',
          period_number: state.reflectionPeriodNumber,
          focus_rating: focusRating,
          answers,
          tasks_snapshot: [], // populated in Task 35 alongside the session variant
        }),
      });
      // Always transition forward, even on POST failure — the user has
      // moved on conceptually, and a failed network shouldn't block the
      // Pomodoro flow. The reducer logs nothing about the failure; a
      // future toast (Phase 3.5) can surface it.
      dispatch({ type: 'REFLECTION_SUBMITTED' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Overlay>
      <div className="bg-bg-primary border border-border rounded p-6 max-w-2xl w-full flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg text-text-primary">
            Period {state.reflectionPeriodNumber} reflection
          </h3>
          <button type="button" onClick={skip} className="text-sm text-text-secondary underline">
            Skip reflection
          </button>
        </div>

        <section>
          <h4 className="text-sm text-text-primary mb-2">Tasks</h4>
          <TaskReviewSections snapshot={snapshot} />
        </section>

        <section>
          <h4 className="text-sm text-text-primary mb-2">How focused were you?</h4>
          <div className="flex gap-2">
            {([1, 2, 3, 4] as FocusRating[]).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setFocusRating(n)}
                aria-pressed={focusRating === n}
                className={`px-4 py-2 rounded border ${
                  focusRating === n
                    ? 'border-accent text-accent'
                    : 'border-border text-text-secondary'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {showHindrances && (
          <section className="flex flex-col gap-2">
            <h4 className="text-sm text-text-primary mb-1">{prompts.hindrance_options}</h4>
            <div className="flex gap-2 flex-wrap">
              {HINDRANCE_OPTIONS.map((opt) => {
                const selected = hindrances.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggleHindrance(opt)}
                    aria-pressed={selected}
                    className={`px-3 py-1 rounded border ${
                      selected ? 'border-accent text-accent' : 'border-border text-text-secondary'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {hindrances.includes('Distractions') && (
              <FreeText label={prompts.hindrance_detail} value={hindranceDetail} onChange={setHindranceDetail} />
            )}
            {hindrances.includes('Unclear Tasks') && (
              <FreeText label={prompts.task_structure_note} value={taskStructure} onChange={setTaskStructure} />
            )}
          </section>
        )}

        <FreeText label={prompts.did_well} value={didWell} onChange={setDidWell} />
        <FreeText label={prompts.do_better} value={doBetter} onChange={setDoBetter} />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={skip}
            className="px-4 py-2 rounded border border-border text-text-secondary hover:bg-bg-secondary"
          >
            Skip all
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting}
            className="px-4 py-2 rounded bg-accent text-bg-primary font-semibold disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Submit'}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function Overlay({ children }: { children: ReactNode }): JSX.Element {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
    >
      {children}
    </div>
  );
}

function FreeText({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}): JSX.Element {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-text-primary">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, FREE_TEXT_MAX))}
        rows={3}
        className="bg-bg-secondary border border-border rounded p-2 text-text-primary resize-none"
      />
      <span className="text-xs text-text-secondary self-end">
        {value.length} / {FREE_TEXT_MAX}
      </span>
    </label>
  );
}
