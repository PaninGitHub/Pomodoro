// SettingsLayout — renders settings sections as either horizontal tabs
// (desktop default, >= 1024px viewport when layout_density='auto') or
// vertical collapsible <details>/<summary> sections (mobile default).
//
// The mode decision (auto vs forced) lives in the caller (SettingsPage)
// so this component is dumb: just receives a `mode` prop and a
// `sections` array. Each section provides its own id, label, and render
// fn. SettingsLayout owns the visual chrome (panel border, padding,
// background, label) so the section render fns return just inner
// content -- no need for them to wrap with their own <section>+<h3>.

import { useState, type ReactNode } from 'react';

export interface SettingsSection {
  id: string;
  label: string;
  render: () => ReactNode;
}

interface Props {
  sections: SettingsSection[];
  mode: 'tabs' | 'collapsible';
}

export function SettingsLayout({ sections, mode }: Props): JSX.Element {
  if (mode === 'tabs') return <TabsLayout sections={sections} />;
  return <CollapsibleLayout sections={sections} />;
}

function TabsLayout({ sections }: { sections: SettingsSection[] }): JSX.Element {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');
  const active = sections.find((s) => s.id === activeId) ?? sections[0];
  if (!active) return <></>;

  return (
    <div className="flex flex-col gap-4">
      <nav role="tablist" aria-label="Settings sections" className="flex flex-wrap gap-1 border-b border-border">
        {sections.map((s) => {
          const selected = s.id === active.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`panel-${s.id}`}
              id={`tab-${s.id}`}
              onClick={() => setActiveId(s.id)}
              className={`px-4 min-h-[44px] text-sm border-b-2 -mb-px transition-colors ${
                selected
                  ? 'border-text-primary text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </nav>
      <section
        role="tabpanel"
        id={`panel-${active.id}`}
        aria-labelledby={`tab-${active.id}`}
        className="border border-border rounded p-4 bg-bg-secondary/30 flex flex-col gap-3"
      >
        <h3 className="text-lg text-text-primary">{active.label}</h3>
        {active.render()}
      </section>
    </div>
  );
}

function CollapsibleLayout({ sections }: { sections: SettingsSection[] }): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      {sections.map((s, i) => (
        <details
          key={s.id}
          open={i === 0}
          className="border border-border rounded bg-bg-secondary/30 group"
        >
          <summary className="cursor-pointer select-none px-4 py-3 min-h-[44px] text-lg text-text-primary list-none flex items-center justify-between hover:bg-bg-secondary/50">
            <span>{s.label}</span>
            <span aria-hidden className="text-text-secondary text-sm transition-transform group-open:rotate-90">▶</span>
          </summary>
          <div className="px-4 pb-4 pt-3 flex flex-col gap-3 border-t border-border">
            {s.render()}
          </div>
        </details>
      ))}
    </div>
  );
}
