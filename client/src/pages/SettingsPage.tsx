import { useAuth } from '../auth/useAuth';
import { useSettings } from '../settings/useSettings';
import { useMediaQuery } from '../utils/useMediaQuery';
import { SettingsLayout, type SettingsSection } from '../settings/SettingsLayout';
import { TimerSettings } from '../settings/groups/TimerSettings';
import { AlarmSettings } from '../settings/groups/AlarmSettings';
import { ReflectionSettings } from '../settings/groups/ReflectionSettings';
import { AppearanceSettings } from '../settings/groups/AppearanceSettings';
import { AccountSettings } from '../settings/groups/AccountSettings';

// Breakpoint: 1024px and above gets tabs by default. Below, collapsible.
// Covers laptops + most tablet landscape orientations on the tabs side;
// phones + tablet portrait on the collapsible side. User can override via
// settings.layout_density.
const DESKTOP_BREAKPOINT = '(min-width: 1024px)';

// Tiny inline component for the Music placeholder. ComingSoonCard supplied
// its own <section>+<h3> chrome which now lives in SettingsLayout, so we
// just render the placeholder text.
function MusicPlaceholder(): JSX.Element {
  return (
    <p className="text-sm text-text-secondary italic">Coming in Phase 7.</p>
  );
}

export function SettingsPage(): JSX.Element {
  const { state: authState } = useAuth();
  const { settings } = useSettings();
  const isDesktop = useMediaQuery(DESKTOP_BREAKPOINT);

  // Resolve 'auto' against current viewport; 'tabs' / 'collapsible' force.
  const mode: 'tabs' | 'collapsible' =
    settings.layout_density === 'tabs'        ? 'tabs' :
    settings.layout_density === 'collapsible' ? 'collapsible' :
    isDesktop ? 'tabs' : 'collapsible';

  // Section order per user spec (Phase 4.5):
  // Appearance → Timer → Alarm → Music → Reflections → Account
  const sections: SettingsSection[] = [
    { id: 'appearance',  label: 'Appearance',  render: () => <AppearanceSettings /> },
    { id: 'timer',       label: 'Timer',       render: () => <TimerSettings /> },
    { id: 'alarm',       label: 'Alarm',       render: () => <AlarmSettings /> },
    { id: 'music',       label: 'Music',       render: () => <MusicPlaceholder /> },
    { id: 'reflections', label: 'Reflections', render: () => <ReflectionSettings /> },
  ];
  // Account section only when signed in -- AccountSettings itself also
  // gates internally, but excluding it here keeps the tab bar / collapsible
  // list clean for guests (no empty panel when they click Account).
  if (authState.kind === 'signed_in') {
    sections.push({ id: 'account', label: 'Account', render: () => <AccountSettings /> });
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 flex flex-col gap-6">
      <h2 className="text-2xl text-text-primary">Settings</h2>
      <SettingsLayout sections={sections} mode={mode} />
    </div>
  );
}
