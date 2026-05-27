import { useState, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ClientTask } from './TasksContext';
import { useTasks } from './useTasks';

const MAX_NAME = 64;

interface Props { task: ClientTask; }

export function TaskRow({ task }: Props): JSX.Element {
  const { updateTask, deleteTask, toggleComplete } = useTasks();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const [editingName, setEditingName] = useState(false);
  const [editingEstimate, setEditingEstimate] = useState(false);
  const [nameRaw, setNameRaw] = useState(task.name);
  const [estimateRaw, setEstimateRaw] = useState(String(task.time_estimate));
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const estInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (editingName) nameInputRef.current?.focus(); }, [editingName]);
  useEffect(() => { if (editingEstimate) estInputRef.current?.focus(); }, [editingEstimate]);

  function commitName() {
    const trimmed = nameRaw.trim();
    if (trimmed && trimmed !== task.name && trimmed.length <= MAX_NAME) {
      void updateTask(task.id, { name: trimmed });
    } else {
      setNameRaw(task.name);
    }
    setEditingName(false);
  }
  function commitEstimate() {
    const n = Number.parseInt(estimateRaw, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 1440 && n !== task.time_estimate) {
      void updateTask(task.id, { time_estimate: n });
    } else {
      setEstimateRaw(String(task.time_estimate));
    }
    setEditingEstimate(false);
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-2 py-2 border border-border rounded bg-bg-secondary ${task.is_complete ? 'opacity-70' : ''}`}
    >
      {/* Drag handle: always visible on mobile, hover-on-desktop */}
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab select-none text-text-secondary md:opacity-30 md:group-hover:opacity-100 hover:text-text-primary"
        aria-label="Drag to reorder"
      >
        ⠿
      </span>

      <input
        type="checkbox"
        checked={task.is_complete}
        onChange={() => void toggleComplete(task.id)}
        aria-label={`Mark ${task.name} ${task.is_complete ? 'incomplete' : 'complete'}`}
      />

      {editingName ? (
        <input
          ref={nameInputRef}
          type="text"
          value={nameRaw}
          maxLength={MAX_NAME}
          onChange={(e) => setNameRaw(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitName();
            if (e.key === 'Escape') { setNameRaw(task.name); setEditingName(false); }
          }}
          className="flex-1 px-1 py-0.5 bg-bg-tertiary border border-border rounded text-text-primary"
        />
      ) : (
        <span
          onClick={() => setEditingName(true)}
          className={`flex-1 cursor-text ${task.is_complete ? 'line-through text-text-secondary' : 'text-text-primary'}`}
        >
          {task.name}
        </span>
      )}

      {editingEstimate ? (
        <input
          ref={estInputRef}
          type="number"
          min={1}
          max={1440}
          value={estimateRaw}
          onChange={(e) => setEstimateRaw(e.target.value)}
          onBlur={commitEstimate}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEstimate();
            if (e.key === 'Escape') { setEstimateRaw(String(task.time_estimate)); setEditingEstimate(false); }
          }}
          className="w-16 px-1 py-0.5 bg-bg-tertiary border border-border rounded text-text-primary"
        />
      ) : (
        <span
          onClick={() => setEditingEstimate(true)}
          className="cursor-text text-text-secondary text-sm whitespace-nowrap"
          aria-label={`${task.time_estimate} minutes`}
        >
          {task.time_estimate} min
        </span>
      )}

      <button
        type="button"
        onClick={() => void deleteTask(task.id)}
        className="text-text-secondary hover:text-error px-1"
        aria-label={`Delete ${task.name}`}
      >
        ×
      </button>
    </li>
  );
}
