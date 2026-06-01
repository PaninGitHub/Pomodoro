import { useState } from 'react';
import { useSettings } from '../useSettings';
import { FONTS } from '../../fonts/fontConfig';
import { THEMES } from '../../themes/themeConfig';
import { CustomThemeEditor } from '../../themes/CustomThemeEditor';
import type { CustomTheme } from '../settingsTypes';

const labelCls = 'flex items-center gap-2 text-sm text-text-secondary';
const selectCls = 'px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary';

export function AppearanceSettings(): JSX.Element {
  const { settings, updateSettings } = useSettings();
  // null sentinel = no editor open. CustomTheme | null = editing an
  // existing custom theme. The string 'new' = create-new mode.
  const [editing, setEditing] = useState<CustomTheme | null | 'new'>(null);

  function onFontChange(family: string) {
    const def = FONTS.find((f) => f.family === family);
    if (!def) return;
    // Persist to Settings (auth → DB, guest → cookie). The useFont hook
    // subscribes to settings.font and applies the CSS variable + Google
    // Fonts <link> tag on change. Per Phase 2 audit: no localStorage.
    void updateSettings({ font: def.family });
  }

  // Active custom theme (if any) — drives the visibility of the Edit button.
  const activeCustom = settings.custom_themes.find((t) => t.key === settings.theme) ?? null;

  return (
    <>
      <div className="flex flex-col gap-2">
        <label className={labelCls}>
          Theme
          <select value={settings.theme}
                  onChange={(e) => updateSettings({ theme: e.target.value })}
                  className={selectCls}>
            {/* Built-in themes first, then a divider, then custom themes
                (settings.custom_themes is server-sorted by label, stable
                across edits). */}
            <optgroup label="Built-in">
              {THEMES.map((t) => (<option key={t.key} value={t.key}>{t.label}</option>))}
            </optgroup>
            {settings.custom_themes.length > 0 && (
              <optgroup label="Custom">
                {settings.custom_themes.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        <div className="flex items-center gap-2 ml-auto">
          {activeCustom && (
            <button
              type="button"
              onClick={() => setEditing(activeCustom)}
              className="px-3 py-1 text-xs rounded border border-border text-text-secondary hover:bg-bg-secondary"
            >
              Edit selected theme
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="px-3 py-1 text-xs rounded border border-border text-text-secondary hover:bg-bg-secondary"
          >
            + Create custom theme
          </button>
        </div>
      </div>

      {editing !== null && (
        <CustomThemeEditor
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

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

      <label className={labelCls}>
        <input type="checkbox" checked={settings.show_avatar}
               onChange={(e) => updateSettings({ show_avatar: e.target.checked })} />
        Show profile avatar in header
      </label>

      <label className={labelCls}>
        <input type="checkbox" checked={settings.show_hours}
               onChange={(e) => updateSettings({ show_hours: e.target.checked })} />
        Show hours in timer display (HH:MM:SS vs MMM:SS)
      </label>

      <label className={labelCls}>
        Week starts on
        <select value={settings.week_start}
                onChange={(e) => updateSettings({ week_start: e.target.value as 'sunday' | 'monday' })}
                className={selectCls}>
          <option value="sunday">Sunday</option>
          <option value="monday">Monday</option>
        </select>
      </label>

      <label className={labelCls}>
        Settings layout
        <select value={settings.layout_density}
                onChange={(e) => updateSettings({ layout_density: e.target.value as 'auto' | 'tabs' | 'collapsible' })}
                className={selectCls}>
          <option value="auto">Auto (tabs on wide screens, collapsible on narrow)</option>
          <option value="tabs">Tabs (horizontal)</option>
          <option value="collapsible">Collapsible (vertical)</option>
        </select>
      </label>

      <label className={labelCls}>
        Logs modal size
        <select value={settings.modal_size}
                onChange={(e) => updateSettings({ modal_size: e.target.value as 'small' | 'medium' | 'large' })}
                className={selectCls}>
          <option value="small">Small (~60% of screen)</option>
          <option value="medium">Medium (~80% of screen)</option>
          <option value="large">Large (~95% of screen)</option>
        </select>
      </label>
    </>
  );
}
