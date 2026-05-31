// Single break-activity row with inline edit, drag handle, delete.
// Structure mirrors tasks/TaskRow.tsx; differences:
//   - no checkbox / is_complete (activities are not "completed")
//   - estimate suffix "min" matches tasks' visual rhythm

import { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ClientBreakActivity } from './breakTypes';
import { ACTIVITY_NAME_MAX, ACTIVITY_TIME_ESTIMATE_MIN, ACTIVITY_TIME_ESTIMATE_MAX } from './breakTypes';
import { useBreakActivities } from './useBreakActivities';

interface Props { activity: ClientBreakActivity; }

export function BreakActivityRow({ activity }: Props): JSX.Element {
  const { updateActivity, deleteActivity } = useBreakActivities();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: activity.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editingName, setEditingName] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState(false);
  const [nameRaw, setNameRaw] = useState(activity.name);
  const [estimateRaw, setEstimateRaw] = useState(String(activity.time_estimate));
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const estInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (editingName) nameInputRef.current?.focus(); }, [editingName]);
  useEffect(() => { if (editingEstimate) estInputRef.current?.focus(); }, [editingEstimate]);

  function commitName() {
    const trimmed = nameRaw.trim();
    if (trimmed && trimmed !== activity.name && trimmed.length <= ACTIVITY_NAME_MAX) {
      void updateActivity(activity.id, { name: trimmed });
    } else {
      setNameRaw(activity.name);
    }
    setEditingName(false);
  }
  function commitEstimate() {
    const n = Number.parseInt(estimateRaw, 10);
    if (
      Number.isFinite(n) &&
      n >= ACTIVITY_TIME_ESTIMATE_MIN &&
      n <= ACTIVITY_TIME_ESTIMATE_MAX &&
      n !== activity.time_estimate
    ) {
      void updateActivity(activity.id, { time_estimate: n });
    } else {
      setEstimateRaw(String(activity.time_estimate));
    }
    setEditingEstimate(false);
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 px-2 py-2 border border-border rounded bg-bg-secondary"
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab select-none text-text-secondary md:opacity-30 md:group-hover:opacity-100 hover:text-text-primary"
        aria-label="Drag to reorder"
      >
        ⠿
      </span>

      {editingName ? (
        <input
          ref={nameInputRef}
          type="text"
          value={nameRaw}
          maxLength={ACTIVITY_NAME_MAX}
          onChange={(e) => setNameRaw(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitName();
            if (e.key === 'Escape') { setNameRaw(activity.name); setEditingName(false); }
          }}
          className="flex-1 px-1 py-0.5 bg-bg-tertiary border border-border rounded text-text-primary"
        />
      ) : (
        <span
          onClick={() => setEditingName(true)}
          className="flex-1 cursor-text text-text-primary"
        >
          {activity.name}
        </span>
      )}

      {editingEstimate ? (
        <input
          ref={estInputRef}
          type="number"
          min={ACTIVITY_TIME_ESTIMATE_MIN}
          max={ACTIVITY_TIME_ESTIMATE_MAX}
          value={estimateRaw}
          onChange={(e) => setEstimateRaw(e.target.value)}
          onBlur={commitEstimate}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEstimate();
            if (e.key === 'Escape') { setEstimateRaw(String(activity.time_estimate)); setEditingEstimate(false); }
          }}
          className="w-16 px-1 py-0.5 bg-bg-tertiary border border-border rounded text-text-primary"
        />
      ) : (
        <span
          onClick={() => setEditingEstimate(true)}
          className="cursor-text text-text-secondary text-sm whitespace-nowrap"
          aria-label={`${activity.time_estimate} minutes`}
        >
          {activity.time_estimate} min
        </span>
      )}

      <button
        type="button"
        onClick={() => void deleteActivity(activity.id)}
        className="text-text-secondary hover:text-error px-1"
        aria-label={`Delete ${activity.name}`}
      >
        ×
      </button>
    </li>
  );
}
