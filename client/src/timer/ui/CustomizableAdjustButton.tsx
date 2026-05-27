interface Props {
  onAdjust: (deltaMinutes: number) => void;
  step: number; // step in minutes; configurable in Settings (default 5)
}

/**
 * +/- mid-session adjust buttons. Step value is configured in Settings
 * (timer_adjust_step_minutes) and passed in via props. Phase 1's
 * double-click-to-edit was removed per user feedback — Settings is the
 * single source of truth for the step value now.
 */
export function CustomizableAdjustButton({ onAdjust, step }: Props): JSX.Element {
  const btn = 'px-3 py-1 rounded border border-border bg-bg-secondary text-text-primary hover:bg-bg-tertiary';
  return (
    <div className="flex gap-2 items-center">
      <button type="button" onClick={() => onAdjust(-step)} className={btn}>
        -{step} min
      </button>
      <button type="button" onClick={() => onAdjust(step)} className={btn}>
        +{step} min
      </button>
    </div>
  );
}
