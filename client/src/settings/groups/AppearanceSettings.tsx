import { useSettings } from '../useSettings';
import { FONTS, LS_FONT_KEY } from '../../fonts/fontConfig';

const labelCls = 'flex items-center gap-2 text-sm text-text-secondary';
const selectCls = 'px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary';

const THEMES = [
  { value: 'bw-dark', label: 'Black & White (Dark)' },
];

export function AppearanceSettings(): JSX.Element {
  const { settings, updateSettings } = useSettings();

  function onFontChange(family: string) {
    const def = FONTS.find((f) => f.family === family);
    if (!def) return;
    // Persist the font key to localStorage (used by useFont on next mount).
    localStorage.setItem(LS_FONT_KEY, def.key);
    // Apply immediately by updating the CSS variable.
    document.documentElement.style.setProperty('--font-active', def.family);
    // Re-inject the Google Fonts <link> for the new font.
    document.head.querySelectorAll('link[data-simplidoro-font]').forEach((n) => n.remove());
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${def.googleParam}&display=swap`;
    link.setAttribute('data-simplidoro-font', def.key);
    document.head.appendChild(link);
    // Persist to Settings (auth → DB, guest → cookie).
    void updateSettings({ font: def.family });
  }

  return (
    <section className="border border-border rounded p-4 bg-bg-secondary/30 flex flex-col gap-3">
      <h3 className="text-lg text-text-primary">Appearance</h3>

      <label className={labelCls}>
        Theme
        <select value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value })}
                className={selectCls}>
          {THEMES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
        </select>
      </label>

      <label className={labelCls}>
        Font
        <select value={settings.font}
                onChange={(e) => onFontChange(e.target.value)}
                className={selectCls}>
          {FONTS.map((f) => (<option key={f.key} value={f.family}>{f.family}</option>))}
        </select>
      </label>

      <label className={labelCls}>
        Hour format
        <select value={settings.hour_format}
                onChange={(e) => updateSettings({ hour_format: e.target.value })}
                className={selectCls}>
          <option value="12h">12-hour</option>
          <option value="24h">24-hour</option>
        </select>
      </label>
    </section>
  );
}
