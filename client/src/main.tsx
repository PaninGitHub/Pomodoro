import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { AuthProvider } from './auth/AuthContext';
import { SettingsProvider } from './settings/SettingsContext';
import { TasksProvider } from './tasks/TasksContext';
import { TimerProvider } from './timer/state/TimerContext';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root not found in index.html');

createRoot(rootEl).render(
  <StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <TasksProvider>
          <TimerProvider>
            <App />
          </TimerProvider>
        </TasksProvider>
      </SettingsProvider>
    </AuthProvider>
  </StrictMode>
);
