import { Link, Outlet } from 'react-router-dom';
import { AuthWidget } from './AuthWidget';

export function AppLayout(): JSX.Element {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        {/* TODO(phase-?-logo-asset): replace text wordmark with logo image
            when project owner provides asset (Batch F OQ-04). Place at /logo.svg. */}
        <Link to="/" className="text-lg font-semibold text-text-primary no-underline">
          Simplidoro
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/settings" className="text-text-secondary hover:text-text-primary text-lg" aria-label="Settings">
            ⚙
          </Link>
          <AuthWidget />
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center">
        <Outlet />
      </main>
    </div>
  );
}
