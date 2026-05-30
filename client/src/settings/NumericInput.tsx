import { useState, useEffect } from 'react';

/**
 * Numeric settings input that can be CLEARED during typing without
 * desyncing or freezing (Phase 2 mid-fix).
 *
 * Behavior:
 *  - The displayed string is local — clearing it stays cleared while
 *    the user edits. The committed value only flushes on blur or Enter.
 *  - On commit: blank → 0 if `zeroAllowed`, else `defaultValue`.
 *  - On commit: out-of-range numbers are clamped to [min, max].
 *  - Renders an inline helper line when zero is not allowed so the user
 *    knows why a blank field reverts to the default instead of zero.
 */
interface Props {
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  zeroAllowed?: boolean;     // default: false
  integer?: boolean;          // default: true
  step?: number | 'any';
  onSave: (n: number) => void;
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
}

export function NumericInput({
  value, defaultValue, min, max,
  zeroAllowed = false, integer = true, step,
  onSave, className, ariaLabel, disabled,
}: Props): JSX.Element {
  const [raw, setRaw] = useState<string>(String(value));

  // Re-mirror external value when settings change (e.g. server sync,
  // settings live-sync, validation revert). Skip the re-mirror while
  // the input is focused so we don't snap raw out from under the user.
  useEffect(() => {
    if (document.activeElement?.getAttribute('data-numeric-id') !== String(value) + className) {
      setRaw(String(value));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function commit() {
    if (raw === '') {
      const final = zeroAllowed ? 0 : defaultValue;
      onSave(final);
      setRaw(String(final));
      return;
    }
    const parsed = integer ? Number.parseInt(raw, 10) : Number(raw);
    if (!Number.isFinite(parsed)) {
      setRaw(String(value));
      return;
    }
    const lower = zeroAllowed ? 0 : min;
    const clamped = Math.min(Math.max(integer ? Math.round(parsed) : parsed, lower), max);
    onSave(clamped);
    setRaw(String(clamped));
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <input
        type="number"
        min={zeroAllowed ? 0 : min}
        max={max}
        step={step ?? (integer ? 1 : 'any')}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        aria-label={ariaLabel}
        disabled={disabled}
        className={className}
      />
      {!zeroAllowed && (
        <span className="text-[10px] text-text-secondary">min {min}; blank → {defaultValue}</span>
      )}
    </span>
  );
}
