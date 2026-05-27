import { useSettings } from '../useSettings';

const inputCls = 'px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary w-24';
const labelCls = 'flex items-center gap-2 text-sm text-text-secondary';

export function TimerSettings(): JSX.Element {
  const { settings, updateSettings } = useSettings();

  function onNum<K extends keyof typeof settings>(key: K, value: string, isFloat = false) {
    const n = isFloat ? Number(value) : Number.parseInt(value, 10);
    if (!Number.isFinite(n)) return;
    void updateSettings({ [key]: n } as Partial<typeof settings>);
  }
  function onBool<K extends keyof typeof settings>(key: K, value: boolean) {
    void updateSettings({ [key]: value } as Partial<typeof settings>);
  }

  return (
    <section className="border border-border rounded p-4 bg-bg-secondary/30 flex flex-col gap-3">
      <h3 className="text-lg text-text-primary">Timer</h3>

      <label className={labelCls}>
        Work duration (min)
        <input type="number" min={1} max={720} step="any" value={settings.work_duration}
               onChange={(e) => onNum('work_duration', e.target.value, true)} className={inputCls} />
      </label>
      <label className={labelCls}>
        Short break duration (min)
        <input type="number" min={1} max={720} step="any" value={settings.short_break_duration}
               onChange={(e) => onNum('short_break_duration', e.target.value, true)} className={inputCls} />
      </label>
      <label className={labelCls}>
        Long break duration (min)
        <input type="number" min={1} max={720} step="any" value={settings.long_break_duration}
               onChange={(e) => onNum('long_break_duration', e.target.value, true)} className={inputCls} />
      </label>
      <label className={labelCls}>
        Long break every (work periods)
        <input type="number" min={0} max={99} value={settings.long_break_frequency}
               onChange={(e) => onNum('long_break_frequency', e.target.value)} className={inputCls} />
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

      <label className={labelCls}>
        Freestyle ratio (X:1)
        <input type="number" min={0.01} step={0.01} value={settings.freestyle_ratio}
               onChange={(e) => onNum('freestyle_ratio', e.target.value, true)} className={inputCls} />
      </label>
      <label className={labelCls}>
        <input type="checkbox" checked={settings.freestyle_accumulate}
               onChange={(e) => onBool('freestyle_accumulate', e.target.checked)} />
        Freestyle: accumulate unspent break time across periods
      </label>
    </section>
  );
}
