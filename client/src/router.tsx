import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { Landing } from './pages/Landing';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Landing /> },
      // Phase 8: { path: 'privacy', element: <Privacy /> }
    ],
  },
]);

export function Router(): JSX.Element {
  return <RouterProvider router={router} />;
}
