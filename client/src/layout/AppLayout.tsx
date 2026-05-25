import { Outlet } from 'react-router-dom';
import { AuthWidget } from './AuthWidget';

export function AppLayout(): JSX.Element {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        {/* TODO(phase-?-logo-asset): replace text wordmark with logo image
            when project owner provides asset (Batch F OQ-04). Place at /logo.svg. */}
        <h1 className="text-lg font-semibold text-text-primary">Simplidoro</h1>
        <AuthWidget />
      </header>
      <main className="flex-1 flex flex-col items-center">
        <Outlet />
      </main>
    </div>
  );
}
