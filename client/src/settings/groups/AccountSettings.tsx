import { useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { DeleteAccountModal } from '../DeleteAccountModal';
import { KeyboardShortcutsModal } from '../KeyboardShortcutsModal';

export function AccountSettings(): JSX.Element | null {
  const { state } = useAuth();
  const [showDelete, setShowDelete] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Only authenticated users see this group.
  if (state.kind !== 'signed_in') return null;

  return (
    <section className="border border-border rounded p-4 bg-bg-secondary/30 flex flex-col gap-3">
      <h3 className="text-lg text-text-primary">Account</h3>
      <button type="button" onClick={() => setShowShortcuts(true)}
              className="self-start px-4 py-2 rounded border border-border bg-bg-secondary hover:bg-bg-tertiary text-text-primary">
        View keyboard shortcuts
      </button>
      <button type="button" onClick={() => setShowDelete(true)}
              className="self-start px-4 py-2 rounded border border-error text-error hover:bg-error hover:text-bg-primary">
        Delete account
      </button>

      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
      {showDelete    && <DeleteAccountModal onClose={() => setShowDelete(false)} />}
    </section>
  );
}
