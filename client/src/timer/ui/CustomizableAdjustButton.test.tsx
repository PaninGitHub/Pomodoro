import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomizableAdjustButton } from './CustomizableAdjustButton';

describe('CustomizableAdjustButton', () => {
  it('renders +/- pair with default value 1', () => {
    render(<CustomizableAdjustButton onAdjust={() => {}} />);
    expect(screen.getByRole('button', { name: /-1 min/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+1 min/i })).toBeInTheDocument();
  });

  it('calls onAdjust with -value when minus is clicked', async () => {
    const user = userEvent.setup();
    const onAdjust = vi.fn();
    render(<CustomizableAdjustButton onAdjust={onAdjust} />);
    await user.click(screen.getByRole('button', { name: /-1 min/i }));
    expect(onAdjust).toHaveBeenCalledWith(-1);
  });

  it('calls onAdjust with +value when plus is clicked', async () => {
    const user = userEvent.setup();
    const onAdjust = vi.fn();
    render(<CustomizableAdjustButton onAdjust={onAdjust} />);
    await user.click(screen.getByRole('button', { name: /\+1 min/i }));
    expect(onAdjust).toHaveBeenCalledWith(1);
  });

  it('double-click opens inline editor; setting value updates both buttons symmetrically', async () => {
    const user = userEvent.setup();
    render(<CustomizableAdjustButton onAdjust={() => {}} />);
    await user.dblClick(screen.getByRole('button', { name: /-1 min/i }));
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '5');
    await user.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: /-5 min/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /\+5 min/i })).toBeInTheDocument();
  });

  it('rejects values <= 0', async () => {
    const user = userEvent.setup();
    render(<CustomizableAdjustButton onAdjust={() => {}} />);
    await user.dblClick(screen.getByRole('button', { name: /\+1 min/i }));
    const input = screen.getByRole('spinbutton');
    await user.clear(input);
    await user.type(input, '0');
    await user.keyboard('{Enter}');
    // Value should remain at 1
    expect(screen.getByRole('button', { name: /\+1 min/i })).toBeInTheDocument();
  });
});
