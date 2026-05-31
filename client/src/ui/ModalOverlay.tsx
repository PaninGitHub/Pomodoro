import { useEffect, type ReactNode } from 'react';

// Reusable overlay wrapper (Phase 5.5). Used by both URL-driven modals
// (LogsModalRoute) and state-driven modals (BreakActivitiesModal). The
// wrapper itself has zero routing dependency — `onClose` is supplied by
// the caller so it can be `() => navigate('/')` or `() => setOpen(false)`
// indifferently.
//
// Encapsulates the cross-cutting concerns so every new modal gets them
// for free:
//   - Full-screen backdrop (click outside to close → consumer onClose)
//   - Centered modal container with size class
//   - ESC-to-close
//   - role="dialog" + aria-modal + aria-label
//
// `size` defaults to 'medium' but should be driven from settings.modal_size
// in production callers so user preference is respected.

export type ModalSize = 'small' | 'medium' | 'large';

const SIZE_CLS: Record<ModalSize, string> = {
  small: 'w-[60%] max-w-xl max-h-[60vh]',
  medium: 'w-[80%] max-w-3xl max-h-[80vh]',
  large: 'w-[95%] max-w-6xl max-h-[95vh]',
};

interface Props {
  onClose: () => void;
  ariaLabel: string;
  size?: ModalSize;
  children: ReactNode;
}

export function ModalOverlay({
  onClose,
  ariaLabel,
  size = 'medium',
  children,
}: Props): JSX.Element {
  useEffect(() => {
    // Match the project convention used by KeyboardShortcutsModal,
    // ClearAllTasksModal, PerModeSettingsPopup — document-level keydown.
    // window-level was theoretically equivalent but didn't fire in practice
    // (likely a focus/propagation interaction during smoke).
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`bg-bg-primary border border-border rounded shadow-lg overflow-auto ${SIZE_CLS[size]}`}
      >
        {children}
      </div>
    </div>
  );
}
