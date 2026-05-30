import { useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTasks } from './useTasks';
import { TaskRow } from './TaskRow';
import { AddTaskForm } from './AddTaskForm';
import { ClearAllTasksModal } from './ClearAllTasksModal';

export function TodoList(): JSX.Element {
  const { tasks, reorderTasks } = useTasks();
  const [showClear, setShowClear] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = tasks.map((t) => t.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = [...ids];
    const [moved] = reordered.splice(oldIndex, 1);
    if (moved) reordered.splice(newIndex, 0, moved);
    void reorderTasks(reordered);
  }

  return (
    <div className="w-full max-w-2xl flex flex-col gap-3">
      {tasks.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowClear(true)}
            className="text-xs text-text-secondary hover:text-error underline"
          >
            Clear all tasks
          </button>
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ul className="flex flex-col gap-2 list-none p-0 m-0 group">
            {tasks.map((t) => (<TaskRow key={t.id} task={t} />))}
          </ul>
        </SortableContext>
      </DndContext>
      <AddTaskForm />
      {showClear && <ClearAllTasksModal onClose={() => setShowClear(false)} />}
    </div>
  );
}
