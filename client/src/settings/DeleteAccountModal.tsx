import { useState } from 'react';

interface Props {
  onClose: () => void;
}

export function DeleteAccountModal({ onClose }: Props): JSX.Element {
  const [typed, setTyped] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = typed === 'DELETE' && !submitting;

  async function onConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/user', { method: 'DELETE', credentials: 'include' });
      if (res.status === 200) {
        // Full reload — landing screen will show signed-out state.
        window.location.href = '/';
      } else {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? 'Could not delete account. Please try again.');
        setSubmitting(false);
      }
    } catch {
      setError('Server unreachable. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="delete-account-title"
         className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-bg-primary border border-border rounded p-6 max-w-md w-full flex flex-col gap-4">
        <h3 id="delete-account-title" className="text-lg text-text-primary">Delete account</h3>
        <p className="text-sm text-text-secondary">
          This will permanently delete your account and all your data. This cannot be undone.
        </p>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Type <span className="font-mono text-text-primary">DELETE</span> to confirm:
          <input type="text" value={typed} onChange={(e) => setTyped(e.target.value)}
                 className="px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary"
                 autoFocus />
        </label>
        {error && <span role="alert" className="text-error text-sm">{error}</span>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} disabled={submitting}
                  className="px-4 py-2 rounded border border-border bg-bg-secondary hover:bg-bg-tertiary text-text-primary">
            Cancel
          </button>
          <button type="button" onClick={() => void onConfirm()} disabled={!canConfirm}
                  className="px-4 py-2 rounded bg-error text-bg-primary font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}
