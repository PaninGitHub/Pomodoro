import { Router } from './router';
import { useFont } from './fonts/useFont';

export function App(): JSX.Element {
  useFont();
  return <Router />;
}
