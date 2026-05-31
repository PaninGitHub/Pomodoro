import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { Landing } from './pages/Landing';
import { SettingsPage } from './pages/SettingsPage';
import { LogsModalRoute } from './logs/LogsModalRoute';
import { links, routePatterns } from './routes';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'settings', element: <SettingsPage /> },
      // Phase 5.5 — URL-driven Logs modal. Index path silently lands on
      // the default tab; tabbed pattern carries the active tab in the URL.
      { path: routePatterns.logsIndex, element: <LogsModalRoute /> },
      { path: routePatterns.logsTabbed, element: <LogsModalRoute /> },
      // Phase 5.5 — redirects for old standalone routes so existing
      // bookmarks self-correct into the new modal-tab equivalents.
      { path: 'break-logs', element: <Navigate to={links.logs('break')} replace /> },
      { path: 'reflections', element: <Navigate to={links.logs('reflections')} replace /> },
      { path: 'reports', element: <Navigate to={links.logs('reports')} replace /> },
      // Break Activities is now an inline modal off the TimerActionBar
      // icon — no canonical URL. Redirect old route to home.
      { path: 'break-activities', element: <Navigate to={links.home()} replace /> },
      // Phase 8: { path: 'privacy', element: <Privacy /> }
    ],
  },
]);

export function Router(): JSX.Element {
  return <RouterProvider router={router} />;
}
