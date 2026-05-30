import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { useSettings } from '../useSettings';
import { useReflectionPrompts } from '../../reflections/useReflectionPrompts';
import {
  PER_PERIOD_KEYS,
  SESSION_KEYS,
  PROMPT_TEXT_MAX,
  type PromptKey,
} from '../../config/reflection-prompts.config';

const labelCls = 'flex items-center gap-2 text-sm text-text-secondary';
const subheaderCls = 'text-xs uppercase tracking-widest text-text-secondary mt-3 mb-1';

// Human-friendly labels for each prompt key (the raw key is shown small +
// muted as a stable identifier above the textarea).
const PROMPT_LABELS: Record<PromptKey, string> = {
  did_well:            'After a work period — what went well',
  do_better:           'After a work period — what to improve',
  hindrance_options:   'After a low focus rating — what hindered you',
  hindrance_detail:    'After "Distractions" — follow-up question',
  task_structure_note: 'After "Unclear Tasks" — follow-up question',
  accomplishment:      'End of session — biggest accomplishment',
  obstacle:            'End of session — biggest obstacle',
  do_differently:      'End of session — what to do differently',
};

export function ReflectionSettings(): JSX.Element {
  const { state: authState } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { prompts, refresh } = useReflectionPrompts();
  const isAuth = authState.kind === 'signed_in';

  return (
    <section className="border border-border rounded p-4 bg-bg-secondary/30 flex flex-col gap-3">
      <h3 className="text-lg text-text-primary">Reflection</h3>

      <label className={labelCls}>
        <input
          type="checkbox"
          checked={settings.reflection_enabled}
          onChange={(e) => void updateSettings({ reflection_enabled: e.target.checked })}
        />
        Show reflection prompts after each work period and at session end
      </label>

      {!isAuth && (
        <p className="text-xs text-text-secondary italic">
          Sign in to customize your reflection prompts.
        </p>
      )}

      {isAuth && (
        <>
          <div className={subheaderCls}>Per-period prompts</div>
          {PER_PERIOD_KEYS.map((k) => (
            <PromptField key={k} promptKey={k} value={prompts[k]} onSaved={refresh} />
          ))}
          <div className={subheaderCls}>End-of-session prompts</div>
          {SESSION_KEYS.map((k) => (
            <PromptField key={k} promptKey={k} value={prompts[k]} onSaved={refresh} />
          ))}
        </>
      )}
    </section>
  );
}

function PromptField({
  promptKey,
  value,
  onSaved,
}: {
  promptKey: PromptKey;
  value: string;
  onSaved: () => Promise<void>;
}): JSX.Element {
  const [raw, setRaw] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  // Re-mirror external value updates (login, refresh after another field's
  // save) into the local raw — but NOT while the user is mid-edit, or the
  // ReflectionPromptsProvider's refresh would clobber their keystrokes.
  useEffect(() => {
    if (!focused) setRaw(value);
  }, [value, focused]);

  async function save() {
    if (raw === value) return;
    if (raw.length === 0) {
      setError('Prompt cannot be empty.');
      setRaw(value);
      return;
    }
    if (raw.length > PROMPT_TEXT_MAX) {
      setError(`Prompt must be ${PROMPT_TEXT_MAX} characters or fewer.`);
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/prompts', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: { [promptKey]: raw } }),
      });
      if (res.status !== 200) {
        setError('Could not save prompt.');
        setRaw(value);
        return;
      }
      await onSaved();
    } catch {
      setError('Server unreachable.');
      setRaw(value);
    }
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-text-secondary">{PROMPT_LABELS[promptKey]}</span>
      <textarea
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          void save();
        }}
        maxLength={PROMPT_TEXT_MAX}
        rows={2}
        className="bg-bg-secondary border border-border rounded p-2 text-text-primary text-sm resize-none"
      />
      {raw.length >= PROMPT_TEXT_MAX * 0.8 && (
        <span className="text-xs text-text-secondary self-end">
          {raw.length} / {PROMPT_TEXT_MAX}
        </span>
      )}
      {error && (
        <span role="alert" className="text-xs text-error">
          {error}
        </span>
      )}
    </label>
  );
}
