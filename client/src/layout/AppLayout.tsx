import { Link, Outlet } from 'react-router-dom';
import { AuthWidget } from './AuthWidget';
import { BetaBanner } from './BetaBanner';
import { useAuth } from '../auth/useAuth';
import { useGlobalHotkeys } from '../timer/state/useGlobalHotkeys';
import { useTimerAnnounce } from '../timer/state/useTimerAnnounce';
import { links } from '../routes';

export function AppLayout(): JSX.Element {
  const { state: authState } = useAuth();
  const isSignedIn = authState.kind === 'signed_in';
  // Phase 5.5 — global keybinds documented in KeyboardShortcutsModal.
  // Mounted here because it's the always-rendered parent of all routes
  // (lives inside RouterProvider so useNavigate works).
  useGlobalHotkeys();
  // Phase 6 Slice A — screen-reader announcer for timer period transitions.
  const announcement = useTimerAnnounce();

  return (
    <div className="min-h-screen flex flex-col">
      <BetaBanner />
      {/* Phase 6 Slice B — header is flex-wrap + row-gap so narrow mobile
          viewports (≤ 375px) don't push the AuthWidget off-screen when a
          long display_name + "Log out" button can't fit on one row with the
          brand and nav links. Wraps to a second row instead. */}
      <header className="flex items-center justify-between flex-wrap gap-y-2 px-4 py-3 border-b border-border">
        {/* TODO(phase-?-logo-asset): replace text wordmark with logo image
            when project owner provides asset (Batch F OQ-04). Place at /logo.svg. */}
        <Link to={links.home()} className="inline-flex items-center min-h-[44px] text-lg font-semibold text-text-primary no-underline">
          Simplidoro
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-4">
          {/* Phase 5.5 — single Logs trigger replaces Break log / Reflections
              / Reports. Auth-gated because Reports (the default tab) is
              authenticated-only per F-28 spec line 1561. Break log and
              Reflections also have no value for guests today.
              Phase 6 Slice B: min-h-[44px] for 44×44 touch target. */}
          {isSignedIn && (
            <Link to={links.logs('reports')} className="inline-flex items-center min-h-[44px] text-text-secondary hover:text-text-primary text-sm">
              Logs
            </Link>
          )}
          <Link to="/settings" className="inline-flex items-center min-h-[44px] text-text-secondary hover:text-text-primary text-sm">
            Settings
          </Link>
          <AuthWidget />
        </nav>
      </header>
      <main className="flex-1 flex flex-col items-center">
        <Outlet />
      </main>
      {/* Phase 6 Slice A — aria-live region for timer transitions. Hidden
          visually; screen readers announce changes politely (won't
          interrupt other speech). */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}
