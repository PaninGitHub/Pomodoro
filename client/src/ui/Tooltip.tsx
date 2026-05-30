import { type ReactNode } from 'react';

interface Props {
  label: string;
  children: ReactNode;
  /** Position the tooltip above (default) or below the wrapped element. */
  position?: 'above' | 'below';
}

/**
 * Tailwind-only tooltip. Shows on hover/focus of the wrapped element.
 * No JS state; just a sibling `<span>` that fades in via group-hover/focus.
 *
 * Wrap a single focusable element (e.g. <button>) for a11y — the tooltip
 * appears on both hover AND keyboard focus.
 */
export function Tooltip({ label, children, position = 'above' }: Props): JSX.Element {
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className={[
          'pointer-events-none absolute left-1/2 -translate-x-1/2 z-20',
          'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
          'transition-opacity duration-150',
          'whitespace-nowrap px-2 py-1 rounded text-xs',
          'bg-bg-tertiary border border-border text-text-primary',
          position === 'above' ? 'bottom-full mb-2' : 'top-full mt-2',
        ].join(' ')}
      >
        {label}
      </span>
    </span>
  );
}
