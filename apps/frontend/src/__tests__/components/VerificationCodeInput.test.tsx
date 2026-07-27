import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VerificationCodeInput } from '@/components/ui/VerificationCodeInput';

describe('VerificationCodeInput', () => {
  it('renders the configured number of inputs', () => {
    render(<VerificationCodeInput length={6} />);
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
  });

  it('advances focus on digit entry and calls onComplete', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    const onChange = vi.fn();
    render(
      <VerificationCodeInput length={4} onChange={onChange} onComplete={onComplete} />,
    );
    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], '1');
    await user.type(inputs[1], '2');
    await user.type(inputs[2], '3');
    await user.type(inputs[3], '4');
    expect(onComplete).toHaveBeenCalledWith('1234');
    expect(onChange).toHaveBeenLastCalledWith('1234');
  });

  it('rejects non-numeric input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<VerificationCodeInput length={4} onChange={onChange} />);
    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], 'a');
    expect(inputs[0]).toHaveValue('');
  });

  it('handles paste of multi-digit code', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<VerificationCodeInput length={6} onComplete={onComplete} />);
    const inputs = screen.getAllByRole('textbox');
    inputs[0].focus();
    await user.paste('123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
  });

  it('shows error message and marks inputs invalid', () => {
    render(<VerificationCodeInput length={4} error="Invalid code" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid code');
    expect(screen.getAllByRole('textbox')[0]).toHaveAttribute('aria-invalid', 'true');
  });

  it('handles backspace to clear and move focus back', async () => {
    const user = userEvent.setup();
    render(<VerificationCodeInput length={4} />);
    const inputs = screen.getAllByRole('textbox');
    await user.type(inputs[0], '1');
    await user.type(inputs[1], '2');
    expect(inputs[1]).toHaveValue('2');
    await user.keyboard('{Backspace}');
    expect(inputs[1]).toHaveValue('');
    await user.keyboard('{Backspace}');
    expect(inputs[0]).toHaveValue('');
  });
});
