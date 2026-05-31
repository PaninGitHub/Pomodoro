import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { ModalOverlay } from '../ui/ModalOverlay';
import { LogsModalView } from './LogsModalView';
import { DEFAULT_LOGS_TAB, isLogsTab, links } from '../routes';
import { useSettings } from '../settings/useSettings';

// Thin route component (Phase 5.5).
// Sole responsibilities:
//   1. Read :tab from useParams.
//   2. Branch:
//      - undefined (bare /logs)         → mount modal with default tab silently
//      - present + valid (/logs/break)  → mount modal with that tab
//      - present + invalid (/logs/x)    → <Navigate replace> to default tab
//        so the URL self-corrects without stacking history
//   3. Mount ModalOverlay with a close handler that navigates home.
//   4. Delegate rendering to LogsModalView (presentational).
//
// No data fetching, no state, no business logic here.

export function LogsModalRoute(): JSX.Element {
  const navigate = useNavigate();
  const { tab } = useParams<{ tab?: string }>();
  const { settings } = useSettings();

  if (tab !== undefined && !isLogsTab(tab)) {
    return <Navigate to={links.logs(DEFAULT_LOGS_TAB)} replace />;
  }
  const activeTab = isLogsTab(tab) ? tab : DEFAULT_LOGS_TAB;

  return (
    <ModalOverlay
      onClose={() => navigate(links.home())}
      ariaLabel="Activity logs"
      size={settings.modal_size}
    >
      <LogsModalView activeTab={activeTab} />
    </ModalOverlay>
  );
}
