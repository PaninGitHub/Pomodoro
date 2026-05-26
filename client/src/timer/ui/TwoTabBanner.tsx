interface Props { visible: boolean; }

export function TwoTabBanner({ visible }: Props): JSX.Element | null {
  if (!visible) return null;
  return (
    <div role="alert" className="w-full bg-warning text-bg-primary px-4 py-2 text-sm text-center">
      Simplidoro is already running in another tab. Please use that tab to avoid conflicts.
    </div>
  );
}
