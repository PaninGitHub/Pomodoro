import { Link } from 'react-router-dom';
import { LOGS_TABS, links, type LogsTab } from '../routes';
import { BreakLogContent } from '../breaks/BreakLogPage';
import { ReflectionLogContent } from '../reflections/ReflectionLogPage';
import { ReportsContent } from '../pages/ReportsPage';

// Presentational shell for the Logs modal (Phase 5.5).
//
// Renders the tab bar + a content slot keyed off activeTab. Each tab body
// is a Content component lifted out of the original full-page route file
// (BreakLogContent, ReflectionLogContent, ReportsContent). Same component
// renders in either shell — full page (max-width chrome + heading) or
// inside the modal — so there's no fork between the two surfaces.
//
// Tabs are <Link>s so each switch updates the URL — that's the whole point
// of the URL-driven modal pattern: back-button works, refresh restores tab,
// bookmark deeplinks.

const TAB_LABELS: Record<LogsTab, string> = {
  break: 'Break log',
  reflections: 'Reflections',
  reports: 'Reports',
};

interface Props {
  activeTab: LogsTab;
}

export function LogsModalView({ activeTab }: Props): JSX.Element {
  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-border" role="tablist" aria-label="Logs sections">
        {LOGS_TABS.map((t) => {
          const selected = t === activeTab;
          return (
            <Link
              key={t}
              to={links.logs(t)}
              role="tab"
              aria-selected={selected}
              className={`px-4 py-3 text-sm border-b-2 ${
                selected
                  ? 'border-accent text-text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {TAB_LABELS[t]}
            </Link>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'break' && <BreakLogContent />}
        {activeTab === 'reflections' && <ReflectionLogContent />}
        {activeTab === 'reports' && <ReportsContent />}
      </div>
    </div>
  );
}
