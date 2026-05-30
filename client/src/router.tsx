import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { Landing } from './pages/Landing';
import { SettingsPage } from './pages/SettingsPage';
import { ReflectionLogPage } from './reflections/ReflectionLogPage';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'reflections', element: <ReflectionLogPage /> },
      // Phase 8: { path: 'privacy', element: <Privacy /> }
    ],
  },
]);

export function Router(): JSX.Element {
  return <RouterProvider router={router} />;
}
