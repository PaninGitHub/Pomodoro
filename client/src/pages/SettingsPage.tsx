import { TimerSettings } from '../settings/groups/TimerSettings';
import { AlarmSettings } from '../settings/groups/AlarmSettings';
import { AppearanceSettings } from '../settings/groups/AppearanceSettings';
import { AccountSettings } from '../settings/groups/AccountSettings';
import { ComingSoonCard } from '../settings/groups/ComingSoonCard';

export function SettingsPage(): JSX.Element {
  return (
    <div className="w-full max-w-2xl mx-auto p-4 md:p-8 flex flex-col gap-6">
      <h2 className="text-2xl text-text-primary">Settings</h2>
      <TimerSettings />
      <AlarmSettings />
      {/* Group 3: Reflection — Phase 3 */}
      <ComingSoonCard title="Reflection" phase={3} />
      {/* Group 4: Music — Phase 7 */}
      <ComingSoonCard title="Music" phase={7} />
      <AppearanceSettings />
      <AccountSettings />
    </div>
  );
}
