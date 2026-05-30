import { useState } from 'react';
import { useReflectionPrompts } from './useReflectionPrompts';
import { HINDRANCE_OPTIONS } from '../config/reflection-prompts.config';
import { Overlay, FreeText, FocusRatingButtons, type FocusRating } from './ReflectionModal';
import type { ReflectionRow } from './reflectionTypes';

interface Props {
  reflection: ReflectionRow;
  onClose: () => void;
  // Called after PATCH succeeds so the parent can refetch the list.
  onSaved: () => void;
}

// Distinct from the timer-driven ReflectionModal:
// - Title prefix "Editing — " + the type-specific suffix
// - Top accent border + "Edit mode" pill so users can't confuse it
//   with a fresh post-period reflection
// - "Created: …" timestamp banner under the title
// - Bottom buttons: Cancel + Save changes (NOT Skip + Submit)
// - Network call is PATCH /api/reflections/:id instead of POST
//
// Body fields prefill from the existing reflection.answers map and the
// row's focus_rating. tasks_snapshot stays read-only here (editing the
// task list would conflate the reflection with the user's live tasks
// state — F-10 spec says edit answers + rating, not the snapshot).
export function ReflectionEditModal({ reflection, onClose, onSaved }: Props): JSX.Element {
  const { prompts } = useReflectionPrompts();

  const initialAnswers = reflection.answers ?? {};
  const [focusRating, setFocusRating] = useState<FocusRating | null>(
    reflection.focus_rating !== null && reflection.focus_rating >= 1 && reflection.focus_rating <= 4
      ? (reflection.focus_rating as FocusRating)
      : null,
  );
  const [didWell, setDidWell] = useState<string>(strOf(initialAnswers.did_well));
  const [doBetter, setDoBetter] = useState<string>(strOf(initialAnswers.do_better));
  const [hindrances, setHindrances] = useState<string[]>(arrOf(initialAnswers.hindrance_options));
  const [hindranceDetail, setHindranceDetail] = useState<string>(strOf(initialAnswers.hindrance_detail));
  const [taskStructure, setTaskStructure] = useState<string>(strOf(initialAnswers.task_structure_note));
  const [accomplishment, setAccomplishment] = useState<string>(strOf(initialAnswers.accomplishment));
  const [obstacle, setObstacle] = useState<string>(strOf(initialAnswers.obstacle));
  const [doDifferently, setDoDifferently] = useState<string>(strOf(initialAnswers.do_differently));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSession = reflection.type === 'session';
  const created = new Date(reflection.created_at);
  const showHindrances = focusRating !== null && focusRating <= 2;

  function toggleHindrance(opt: string) {
    setHindrances((prev) => (prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]));
  }

  async function save() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const answers: Record<string, string | string[]> = {};
    if (isSession) {
      if (accomplishment) answers.accomplishment = accomplishment;
      if (obstacle) answers.obstacle = obstacle;
      if (doDifferently) answers.do_differently = doDifferently;
    } else {
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
    }

    try {
      const res = await fetch(`/api/reflections/${reflection.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focus_rating: focusRating,
          answers,
          // tasks_snapshot intentionally NOT sent — preserves the original.
        }),
      });
      if (res.status !== 200) {
        // eslint-disable-next-line no-console
        console.warn(`[ReflectionEditModal] PATCH failed: ${res.status}`);
        setError(`Could not save (server returned ${res.status}).`);
        return;
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      // eslint-disable-next-line no-console
      console.warn(`[ReflectionEditModal] PATCH threw: ${msg}`);
      setError(`Server unreachable: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  const heading = isSession
    ? 'Editing — Session reflection'
    : `Editing — Period ${reflection.period_number ?? '?'} reflection`;
  const createdLabel = `Created ${created.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;

  return (
    <Overlay>
      {/* Top accent bar + "Edit mode" pill so the modal reads obviously
          different from the fresh-reflection one. */}
      <div className="bg-bg-primary border border-border rounded p-6 max-w-2xl w-full flex flex-col gap-4 max-h-[90vh] overflow-y-auto border-t-4 border-t-accent">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest text-accent border border-accent rounded px-2 py-0.5">
              Edit mode
            </span>
            <h3 className="text-lg text-text-primary">{heading}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit"
            className="text-sm text-text-secondary underline"
          >
            Cancel
          </button>
        </div>
        <p className="text-xs text-text-secondary -mt-2">{createdLabel}</p>

        <section>
          <h4 className="text-sm text-text-primary mb-2">How focused were you{isSession ? ' overall' : ''}?</h4>
          <FocusRatingButtons value={focusRating} onChange={setFocusRating} />
        </section>

        {!isSession && (
          <>
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
          </>
        )}

        {isSession && (
          <>
            <FreeText label={prompts.accomplishment} value={accomplishment} onChange={setAccomplishment} />
            <FreeText label={prompts.obstacle} value={obstacle} onChange={setObstacle} />
            <FreeText label={prompts.do_differently} value={doDifferently} onChange={setDoDifferently} />
          </>
        )}

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded border border-border text-text-secondary hover:bg-bg-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={submitting}
            className="px-4 py-2 rounded bg-accent text-bg-primary font-semibold disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </Overlay>
  );
}

// Helpers: prefill state from the row's existing answers, gracefully
// coerce missing / wrong-typed values to empty.

function strOf(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function arrOf(v: unknown): string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string') ? v : [];
}
