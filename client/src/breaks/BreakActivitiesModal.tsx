import { ModalOverlay } from '../ui/ModalOverlay';
import { useSettings } from '../settings/useSettings';
import { BreakActivitiesContent } from './BreakActivitiesPage';

// State-driven modal wrapper for the break activities CRUD surface.
// Triggered by the TimerActionBar icon. Not URL-driven (it's an inline
// settings adjustment, not a "logs view" with deeplinking value).
//
// Reuses the modal_size setting so width/height match user preference
// across all modals consistently.

interface Props {
  onClose: () => void;
}

export function BreakActivitiesModal({ onClose }: Props): JSX.Element {
  const { settings } = useSettings();
  return (
    <ModalOverlay onClose={onClose} ariaLabel="Break activities" size={settings.modal_size}>
      <div className="flex flex-col p-4 gap-4">
        <h3 className="text-lg text-text-primary">Break activities</h3>
        <BreakActivitiesContent />
      </div>
    </ModalOverlay>
  );
}
