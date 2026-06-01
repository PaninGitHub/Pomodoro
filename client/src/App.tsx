import { Router } from './router';
import { useFont } from './fonts/useFont';
import { useTheme } from './themes/useTheme';

export function App(): JSX.Element {
  useFont();
  useTheme();
  return <Router />;
}
