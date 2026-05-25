import { useState, useRef, useEffect } from 'react';

interface Props {
  onAdjust: (deltaMinutes: number) => void;
}

export function CustomizableAdjustButton({ onAdjust }: Props): JSX.Element {
  const [step, setStep] = useState<number>(1);
  const [editing, setEditing] = useState<boolean>(false);
  const [raw, setRaw] = useState<string>('1');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function commit() {
    const n = Number(raw);
    if (Number.isInteger(n) && n > 0) {
      setStep(n);
    }
    setRaw(step.toString());
    setEditing(false);
  }

  const btn = 'px-3 py-1 rounded border border-border bg-bg-secondary text-text-primary hover:bg-bg-tertiary';

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        min={1}
        max={720}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
        className="w-16 px-2 py-1 bg-bg-secondary border border-border rounded text-text-primary"
        aria-label="Adjust step value (minutes)"
      />
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <button
        type="button"
        onClick={() => onAdjust(-step)}
        onDoubleClick={() => setEditing(true)}
        className={btn}
      >
        -{step} min
      </button>
      <button
        type="button"
        onClick={() => onAdjust(step)}
        onDoubleClick={() => setEditing(true)}
        className={btn}
      >
        +{step} min
      </button>
    </div>
  );
}
