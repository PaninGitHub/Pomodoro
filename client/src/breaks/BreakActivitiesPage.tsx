// F-16: user-managed break activity library.
// Page is a thin shell: title + usage counter + drag-reorder list + add form.
// Empty state shows a one-line hint instead of just blank.

import {
  DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useBreakActivities } from './useBreakActivities';
import { useSettings } from '../settings/useSettings';
import { BreakActivityRow } from './BreakActivityRow';
import { AddBreakActivityForm } from './AddBreakActivityForm';

// Presentational content — used by both BreakActivitiesPage (full route)
// and the Phase 5.5 BreakActivitiesModal (TimerActionBar icon button).
// No outer max-width or heading; the shell provides those. Counter stays
// in Content because it's useful information in either shell.
export function BreakActivitiesContent(): JSX.Element {
  const { activities, reorderActivities } = useBreakActivities();
  const { settings } = useSettings();
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = activities.map((a) => a.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = [...ids];
    const [moved] = reordered.splice(oldIndex, 1);
    if (moved) reordered.splice(newIndex, 0, moved);
    void reorderActivities(reordered);
  }

  const limit = settings.break_activity_limit;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-text-secondary">
          Pick from this list when a break starts (Pomodoro and Freestyle modes).
          Adjust the limit in Settings → Timer.
        </p>
        <span
          className="text-xs text-text-secondary whitespace-nowrap"
          aria-label={`${activities.length} of ${limit} activities used`}
        >
          {activities.length} / {limit}
        </span>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-text-secondary italic">
          No activities yet. Add one below — try “Stretch”, “Walk”, or “Water break”.
        </p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={activities.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-2 list-none p-0 m-0 group">
              {activities.map((a) => (<BreakActivityRow key={a.id} activity={a} />))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      <AddBreakActivityForm />
    </div>
  );
}

// BreakActivitiesPage (full-route wrapper) deleted in Phase 5.5 task 19 —
// the old /break-activities route now redirects to home. Content
// component above stays, used by BreakActivitiesModal (TimerActionBar icon).
