import { useState } from 'react';
import { useSettings } from '../useSettings';
import { requestNotificationPermission } from '../../utils/notification';

const inputCls = 'px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary w-24';
const labelCls = 'flex items-center gap-2 text-sm text-text-secondary';

const ALARM_OPTIONS = [
  { value: 'bell',    label: 'Bell' },
  { value: 'bird',    label: 'Bird (Phase 7)' },
  { value: 'digital', label: 'Digital (Phase 7)' },
  { value: 'kitchen', label: 'Kitchen (Phase 7)' },
  { value: 'custom',  label: 'Custom URL' },
];

const URL_RE = /^https:\/\/.*\.(mp3|ogg|wav|m4a|webm)$/i;

export function AlarmSettings(): JSX.Element {
  const { settings, updateSettings } = useSettings();
  const [customUrlRaw, setCustomUrlRaw] = useState<string>(settings.alarm_custom_url ?? '');
  const [customUrlError, setCustomUrlError] = useState<string | null>(null);
  const [notifError, setNotifError] = useState<string | null>(null);

  function onCustomUrlBlur() {
    setCustomUrlError(null);
    if (customUrlRaw === '') {
      void updateSettings({ alarm_custom_url: null });
      return;
    }
    if (customUrlRaw.length > 2048) {
      setCustomUrlError('URL too long (max 2048 chars).');
      return;
    }
    if (!URL_RE.test(customUrlRaw)) {
      setCustomUrlError('URL must start with https:// and end in .mp3, .ogg, .wav, .m4a, or .webm.');
      return;
    }
    void updateSettings({ alarm_custom_url: customUrlRaw });
  }

  async function onNotifToggle(checked: boolean) {
    setNotifError(null);
    if (!checked) {
      void updateSettings({ browser_notifications: false });
      return;
    }
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      void updateSettings({ browser_notifications: true });
    } else {
      setNotifError('Notifications are blocked. Enable them in your browser settings to use this feature.');
      // Keep setting false; component reads from settings so display reverts on next render.
      void updateSettings({ browser_notifications: false });
    }
  }

  return (
    <section className="border border-border rounded p-4 bg-bg-secondary/30 flex flex-col gap-3">
      <h3 className="text-lg text-text-primary">Alarm</h3>

      <label className={labelCls}>
        Sound
        <select value={settings.alarm_sound}
                onChange={(e) => updateSettings({ alarm_sound: e.target.value })}
                className="px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary">
          {ALARM_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
      </label>

      <label className={labelCls}>
        Custom URL (https only, audio file)
        <input type="text" value={customUrlRaw}
               onChange={(e) => setCustomUrlRaw(e.target.value)}
               onBlur={onCustomUrlBlur}
               className="px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary flex-1 min-w-0" />
      </label>
      {customUrlError && <span role="alert" className="text-error text-sm">{customUrlError}</span>}

      <label className={labelCls}>
        Volume
        <input type="range" min={0} max={100} value={settings.alarm_volume}
               onChange={(e) => updateSettings({ alarm_volume: Number.parseInt(e.target.value, 10) })}
               className="flex-1" />
        <span className="w-10 text-right">{settings.alarm_volume}</span>
      </label>

      <label className={labelCls}>
        Repeats
        <input type="number" min={1} max={5} value={settings.alarm_repeats}
               onChange={(e) => updateSettings({ alarm_repeats: Number.parseInt(e.target.value, 10) })}
               className={inputCls} />
      </label>

      <label className={labelCls}>
        <input type="checkbox" checked={settings.browser_notifications}
               onChange={(e) => void onNotifToggle(e.target.checked)} />
        Browser notifications
      </label>
      {notifError && <span role="alert" className="text-error text-sm">{notifError}</span>}
    </section>
  );
}
