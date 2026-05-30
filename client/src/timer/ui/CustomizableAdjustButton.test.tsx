import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomizableAdjustButton } from './CustomizableAdjustButton';

describe('CustomizableAdjustButton', () => {
  it('renders -/+ buttons with the given step value', () => {
    render(<CustomizableAdjustButton onAdjust={() => {}} step={5} />);
    expect(screen.getByRole('button', { name: /-5 min/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+5 min/i })).toBeInTheDocument();
  });

  it('calls onAdjust with -step when minus clicked', async () => {
    const user = userEvent.setup();
    const onAdjust = vi.fn();
    render(<CustomizableAdjustButton onAdjust={onAdjust} step={5} />);
    await user.click(screen.getByRole('button', { name: /-5 min/i }));
    expect(onAdjust).toHaveBeenCalledWith(-5);
  });

  it('calls onAdjust with +step when plus clicked', async () => {
    const user = userEvent.setup();
    const onAdjust = vi.fn();
    render(<CustomizableAdjustButton onAdjust={onAdjust} step={5} />);
    await user.click(screen.getByRole('button', { name: /\+5 min/i }));
    expect(onAdjust).toHaveBeenCalledWith(5);
  });

  it('respects different step values', () => {
    render(<CustomizableAdjustButton onAdjust={() => {}} step={10} />);
    expect(screen.getByRole('button', { name: /-10 min/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+10 min/i })).toBeInTheDocument();
  });
});
