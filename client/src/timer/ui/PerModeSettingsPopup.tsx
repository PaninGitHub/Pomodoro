import { useEffect, useRef } from 'react';
import { useTimer } from '../state/useTimer';
import { useSettings } from '../../settings/useSettings';

const numCls = 'px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary w-24';
const labelCls = 'flex items-center justify-between gap-2 text-sm text-text-secondary';

interface Props {
  onClose: () => void;
}

/**
 * Mode-aware quick settings popup. Opens from the gear icon below the
 * Start button. Shows only the settings relevant to the currently
 * selected mode. Saves go through SettingsContext (persistent).
 *
 * Per Phase 2 user-feedback revision — replaces the on-screen DurationInput
 * / PomodoroSetup / FreestyleSetup that used to render below the timer.
 */
export function PerModeSettingsPopup({ onClose }: Props): JSX.Element {
  const { state } = useTimer();
  const { settings, updateSettings } = useSettings();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Esc closes; click-outside also closes (overlay handles that).
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const title =
    state.mode === 'timer' ? 'Timer settings'
    : state.mode === 'pomodoro' ? 'Pomodoro settings'
    : 'Freestyle settings';

  return (
    <div
      className="fixed inset-0 z-40 bg-black/40 flex items-start justify-center pt-24 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="per-mode-settings-title"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-bg-primary border border-border rounded p-6 max-w-md w-full flex flex-col gap-3"
      >
        <div className="flex items-center justify-between">
          <h3 id="per-mode-settings-title" className="text-lg text-text-primary">{title}</h3>
          <button type="button" onClick={onClose} className="text-text-secondary hover:text-text-primary" aria-label="Close">
            ×
          </button>
        </div>

        {state.mode === 'timer' && (
          <p className="text-xs text-text-secondary italic">
            Timer mode duration is per-session — click the timer display to edit it. Use the +/- step setting below.
          </p>
        )}

        {state.mode === 'pomodoro' && (
          <>
            <label className={labelCls}>
              Work duration (min)
              <input type="number" min={1} max={720} step="any" value={settings.work_duration}
                     onChange={(e) => updateSettings({ work_duration: Number(e.target.value) })} className={numCls} />
            </label>
            <label className={labelCls}>
              Short break (min)
              <input type="number" min={1} max={720} step="any" value={settings.short_break_duration}
                     onChange={(e) => updateSettings({ short_break_duration: Number(e.target.value) })} className={numCls} />
            </label>
            <label className={labelCls}>
              Long break (min)
              <input type="number" min={1} max={720} step="any" value={settings.long_break_duration}
                     onChange={(e) => updateSettings({ long_break_duration: Number(e.target.value) })} className={numCls} />
            </label>
            <label className={labelCls}>
              Long break every (work periods)
              <input type="number" min={0} max={99} value={settings.long_break_frequency}
                     onChange={(e) => updateSettings({ long_break_frequency: Number.parseInt(e.target.value, 10) || 0 })} className={numCls} />
            </label>
            <label className={labelCls}>
              <span>Auto Start Breaks</span>
              <input type="checkbox" checked={settings.auto_start_breaks}
                     onChange={(e) => updateSettings({ auto_start_breaks: e.target.checked })} />
            </label>
            <label className={labelCls}>
              <span>Auto Start Pomodoros</span>
              <input type="checkbox" checked={settings.auto_start_pomodoros}
                     onChange={(e) => updateSettings({ auto_start_pomodoros: e.target.checked })} />
            </label>
          </>
        )}

        {state.mode === 'freestyle' && (
          <>
            <label className={labelCls}>
              Ratio (X work per 1 break)
              <input type="number" min={0.01} step={0.01} value={settings.freestyle_ratio}
                     onChange={(e) => {
                       const n = Number(e.target.value);
                       if (Number.isFinite(n) && n > 0) updateSettings({ freestyle_ratio: n });
                     }} className={numCls} />
            </label>
            <label className={labelCls}>
              <span>Accumulate unspent break time</span>
              <input type="checkbox" checked={settings.freestyle_accumulate}
                     onChange={(e) => updateSettings({ freestyle_accumulate: e.target.checked })} />
            </label>
            {/* TODO(phase-2-freestyle-redesign): add work-duration target + breaks-disabled toggle */}
            <p className="text-xs text-text-secondary italic">
              Freestyle redesign (stopwatch + optional work duration target) coming in the next revision.
            </p>
          </>
        )}

        <label className={labelCls + ' mt-2'}>
          +/- adjust step (min)
          <input type="number" min={1} max={60} value={settings.timer_adjust_step_minutes}
                 onChange={(e) => updateSettings({ timer_adjust_step_minutes: Number.parseInt(e.target.value, 10) || 5 })} className={numCls} />
        </label>
      </div>
    </div>
  );
}
