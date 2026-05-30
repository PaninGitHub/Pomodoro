import { useSettings } from '../useSettings';
import { NumericInput } from '../NumericInput';
import { DEFAULT_SETTINGS } from '../settingsTypes';

const inputCls = 'px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary w-24';
const labelCls = 'flex items-center gap-2 text-sm text-text-secondary';
const subheaderCls = 'text-xs uppercase tracking-widest text-text-secondary mt-2 mb-1';

export function TimerSettings(): JSX.Element {
  const { settings, updateSettings } = useSettings();

  function onBool<K extends keyof typeof settings>(key: K, value: boolean) {
    void updateSettings({ [key]: value } as Partial<typeof settings>);
  }
  function save<K extends keyof typeof settings>(key: K, value: number) {
    void updateSettings({ [key]: value } as Partial<typeof settings>);
  }

  return (
    <section className="border border-border rounded p-4 bg-bg-secondary/30 flex flex-col gap-3">
      <h3 className="text-lg text-text-primary">Timer</h3>

      {/* Pomodoro-mode settings */}
      <div className={subheaderCls}>Pomodoro Mode</div>
      <label className={labelCls}>
        Work duration (min)
        <NumericInput value={settings.work_duration} defaultValue={DEFAULT_SETTINGS.work_duration}
                      min={1} max={720} onSave={(n) => save('work_duration', n)} className={inputCls} />
      </label>
      <label className={labelCls}>
        Short break duration (min)
        <NumericInput value={settings.short_break_duration} defaultValue={DEFAULT_SETTINGS.short_break_duration}
                      min={1} max={720} onSave={(n) => save('short_break_duration', n)} className={inputCls} />
      </label>
      <label className={labelCls}>
        Long break duration (min)
        <NumericInput value={settings.long_break_duration} defaultValue={DEFAULT_SETTINGS.long_break_duration}
                      min={1} max={720} onSave={(n) => save('long_break_duration', n)} className={inputCls} />
      </label>
      <label className={labelCls}>
        Long break every (work periods)
        <NumericInput value={settings.long_break_frequency} defaultValue={DEFAULT_SETTINGS.long_break_frequency}
                      min={0} max={99} zeroAllowed onSave={(n) => save('long_break_frequency', n)} className={inputCls} />
      </label>
      <label className={labelCls}>
        <input type="checkbox" checked={settings.auto_start_breaks}
               onChange={(e) => onBool('auto_start_breaks', e.target.checked)} />
        Auto Start Breaks
      </label>
      <label className={labelCls}>
        <input type="checkbox" checked={settings.auto_start_pomodoros}
               onChange={(e) => onBool('auto_start_pomodoros', e.target.checked)} />
        Auto Start Pomodoros
      </label>

      {/* Freestyle-mode settings */}
      <div className={subheaderCls}>Freestyle Mode</div>
      <label className={labelCls}>
        Ratio (X work per 1 break)
        <NumericInput value={settings.freestyle_ratio} defaultValue={DEFAULT_SETTINGS.freestyle_ratio}
                      min={0.01} max={9999} integer={false} step={0.01}
                      onSave={(n) => save('freestyle_ratio', n)} className={inputCls} />
      </label>
      <label className={labelCls}>
        Work-duration target (min)
        <NumericInput value={settings.freestyle_target_minutes} defaultValue={DEFAULT_SETTINGS.freestyle_target_minutes}
                      min={1} max={720} onSave={(n) => save('freestyle_target_minutes', n)} className={inputCls} />
      </label>
      <label className={labelCls}>
        <input type="checkbox" checked={settings.freestyle_accumulate}
               onChange={(e) => onBool('freestyle_accumulate', e.target.checked)} />
        Accumulate unspent break time across periods
      </label>
      <label className={labelCls}>
        <input type="checkbox" checked={settings.freestyle_breaks_enabled}
               onChange={(e) => onBool('freestyle_breaks_enabled', e.target.checked)} />
        Breaks enabled (when off, End Work ends the session immediately)
      </label>

      {/* All-mode settings */}
      <div className={subheaderCls}>All Modes</div>
      <label className={labelCls}>
        +/- adjust step (min)
        <NumericInput value={settings.timer_adjust_step_minutes} defaultValue={DEFAULT_SETTINGS.timer_adjust_step_minutes}
                      min={1} max={60} onSave={(n) => save('timer_adjust_step_minutes', n)} className={inputCls} />
      </label>
    </section>
  );
}
