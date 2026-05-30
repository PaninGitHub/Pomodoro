import { useState, type ReactNode } from 'react';
import { useTimer } from '../timer/state/useTimer';
import { useTasks } from '../tasks/useTasks';
import { useReflectionPrompts } from './useReflectionPrompts';
import { HINDRANCE_OPTIONS, FREE_TEXT_MAX } from '../config/reflection-prompts.config';
import { TaskReviewSections } from './TaskReviewSections';
import type { PeriodTaskSnapshot } from '../timer/state/timerReducer';

type FocusRating = 1 | 2 | 3 | 4;

// Top-level router. The two variants are extracted into their own
// components so React's mount/unmount lifecycle naturally clears form
// state between reflections — no manual reset effect needed.
export function ReflectionModal(): JSX.Element | null {
  const { state } = useTimer();
  if (state.status !== 'reflecting') return null;
  if (state.reflectionType === 'per_period') return <PerPeriodVariant />;
  if (state.reflectionType === 'session') return <SessionVariant />;
  return null;
}

// ===========================================================================
// Per-period variant (F-07)
// ===========================================================================

function PerPeriodVariant(): JSX.Element {
  const { state, dispatch } = useTimer();
  const { tasks: liveTasks } = useTasks();
  const { prompts } = useReflectionPrompts();
  const [focusRating, setFocusRating] = useState<FocusRating | null>(null);
  const [hindrances, setHindrances] = useState<string[]>([]);
  const [didWell, setDidWell] = useState('');
  const [doBetter, setDoBetter] = useState('');
  const [hindranceDetail, setHindranceDetail] = useState('');
  const [taskStructure, setTaskStructure] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

    const hasAnyAnswer = focusRating !== null || Object.keys(answers).length > 0;
    if (!hasAnyAnswer) {
      dispatch({ type: 'REFLECTION_SKIPPED' });
      return;
    }
    if (!state.currentSessionId) {
      // Guest case (shouldn't reach this modal per F-22). Skip POST so we
      // don't 401 on the server; the local state machine still advances.
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
          tasks_snapshot: buildTasksSnapshotPayload(liveTasks, snapshot),
        }),
      });
      dispatch({ type: 'REFLECTION_SUBMITTED' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Overlay>
      <ModalShell
        title={`Period ${state.reflectionPeriodNumber} reflection`}
        onSkip={skip}
        onSubmit={() => void submit()}
        submitting={submitting}
      >
        <section>
          <h4 className="text-sm text-text-primary mb-2">Tasks</h4>
          <TaskReviewSections snapshot={snapshot} />
        </section>

        <section>
          <h4 className="text-sm text-text-primary mb-2">How focused were you?</h4>
          <FocusRatingButtons value={focusRating} onChange={setFocusRating} />
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
              <div className="flex flex-col gap-1 pl-3 border-l-2 border-accent/40">
                <span className="text-xs uppercase tracking-widest text-text-secondary">For: Distractions</span>
                <FreeText label={prompts.hindrance_detail} value={hindranceDetail} onChange={setHindranceDetail} />
              </div>
            )}
            {hindrances.includes('Unclear Tasks') && (
              <div className="flex flex-col gap-1 pl-3 border-l-2 border-accent/40">
                <span className="text-xs uppercase tracking-widest text-text-secondary">For: Unclear Tasks</span>
                <FreeText label={prompts.task_structure_note} value={taskStructure} onChange={setTaskStructure} />
              </div>
            )}
          </section>
        )}

        <FreeText label={prompts.did_well} value={didWell} onChange={setDidWell} />
        <FreeText label={prompts.do_better} value={doBetter} onChange={setDoBetter} />
      </ModalShell>
    </Overlay>
  );
}

// ===========================================================================
// Session variant (F-08)
// ===========================================================================

function SessionVariant(): JSX.Element {
  const { state, dispatch } = useTimer();
  const { tasks: liveTasks } = useTasks();
  const { prompts } = useReflectionPrompts();
  const [focusRating, setFocusRating] = useState<FocusRating | null>(null);
  const [accomplishment, setAccomplishment] = useState('');
  const [obstacle, setObstacle] = useState('');
  const [doDifferently, setDoDifferently] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Session variant diffs against the WHOLE-session snapshot (union of
  // every period's start snapshot, accumulated by the reducer).
  const snapshot = state.sessionTasksSnapshot ?? [];

  function skip() {
    dispatch({ type: 'REFLECTION_SKIPPED' });
  }

  async function submit() {
    if (submitting) return;

    const answers: Record<string, string> = {};
    if (accomplishment) answers.accomplishment = accomplishment;
    if (obstacle) answers.obstacle = obstacle;
    if (doDifferently) answers.do_differently = doDifferently;

    const hasAnyAnswer = focusRating !== null || Object.keys(answers).length > 0;
    if (!hasAnyAnswer) {
      dispatch({ type: 'REFLECTION_SKIPPED' });
      return;
    }
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
          type: 'session',
          focus_rating: focusRating,
          answers,
          tasks_snapshot: buildTasksSnapshotPayload(liveTasks, snapshot),
        }),
      });
      dispatch({ type: 'REFLECTION_SUBMITTED' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Overlay>
      <ModalShell
        title="Session reflection"
        onSkip={skip}
        onSubmit={() => void submit()}
        submitting={submitting}
      >
        <section>
          <h4 className="text-sm text-text-primary mb-2">Tasks this session</h4>
          <TaskReviewSections snapshot={snapshot} />
        </section>

        <section>
          <h4 className="text-sm text-text-primary mb-2">How focused were you overall?</h4>
          <FocusRatingButtons value={focusRating} onChange={setFocusRating} />
        </section>

        <FreeText label={prompts.accomplishment} value={accomplishment} onChange={setAccomplishment} />
        <FreeText label={prompts.obstacle} value={obstacle} onChange={setObstacle} />
        <FreeText label={prompts.do_differently} value={doDifferently} onChange={setDoDifferently} />
      </ModalShell>
    </Overlay>
  );
}

// ===========================================================================
// Shared helpers
// ===========================================================================

/**
 * Build the persisted tasks_snapshot payload from the live tasks list
 * and the reference snapshot (per-period start or session-wide).
 * Per spec §5: deleted tasks (in snapshot, missing from live) are omitted.
 * The `added_during_period` flag is set for tasks whose id isn't in the
 * reference snapshot.
 */
function buildTasksSnapshotPayload(
  liveTasks: ReadonlyArray<{ id: string; name: string; is_complete: boolean }>,
  reference: ReadonlyArray<PeriodTaskSnapshot>,
): Array<{ task_id: string; name: string; is_complete: boolean; added_during_period: boolean }> {
  const refIds = new Set(reference.map((s) => s.id));
  return liveTasks.map((t) => ({
    task_id: t.id,
    name: t.name,
    is_complete: t.is_complete,
    added_during_period: !refIds.has(t.id),
  }));
}

interface ModalShellProps {
  title: string;
  onSkip: () => void;
  onSubmit: () => void;
  submitting: boolean;
  children: ReactNode;
}

function ModalShell({ title, onSkip, onSubmit, submitting, children }: ModalShellProps): JSX.Element {
  return (
    <div className="bg-bg-primary border border-border rounded p-6 max-w-2xl w-full flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-lg text-text-primary">{title}</h3>
        <button type="button" onClick={onSkip} className="text-sm text-text-secondary underline">
          Skip reflection
        </button>
      </div>
      {children}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="px-4 py-2 rounded border border-border text-text-secondary hover:bg-bg-secondary"
        >
          Skip all
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="px-4 py-2 rounded bg-accent text-bg-primary font-semibold disabled:opacity-50"
        >
          {submitting ? 'Saving…' : 'Submit'}
        </button>
      </div>
    </div>
  );
}

function FocusRatingButtons({
  value,
  onChange,
}: {
  value: FocusRating | null;
  onChange: (v: FocusRating) => void;
}): JSX.Element {
  return (
    <div className="flex gap-2">
      {([1, 2, 3, 4] as FocusRating[]).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-pressed={value === n}
          className={`px-4 py-2 rounded border ${
            value === n ? 'border-accent text-accent' : 'border-border text-text-secondary'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
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
