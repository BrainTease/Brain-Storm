import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DisputeFlagStep } from '@/components/reviews/DisputeFlagStep';
import type { FlagReason } from '@/services/disputeResolutionService';

describe('DisputeFlagStep', () => {
  const defaultProps = {
    reason: 'Spam or advertising' as FlagReason,
    customReason: '',
    onReasonChange: vi.fn(),
    onCustomReasonChange: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  it('should render flag reason options', () => {
    render(<DisputeFlagStep {...defaultProps} />);

    expect(screen.getByText('Spam or advertising')).toBeInTheDocument();
    expect(screen.getByText('Offensive or inappropriate content')).toBeInTheDocument();
    expect(screen.getByText('Fake or misleading review')).toBeInTheDocument();
    expect(screen.getByText('Irrelevant to this course')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('should call onReasonChange when a reason is selected', () => {
    const handleReasonChange = vi.fn();
    render(
      <DisputeFlagStep
        {...defaultProps}
        onReasonChange={handleReasonChange}
      />
    );

    const spamRadio = screen.getAllByRole('radio')[1];
    fireEvent.click(spamRadio);

    expect(handleReasonChange).toHaveBeenCalled();
  });

  it('should show custom reason textarea when "Other" is selected', () => {
    const { rerender } = render(<DisputeFlagStep {...defaultProps} />);

    expect(screen.queryByPlaceholderText('Please describe your reason…')).not.toBeInTheDocument();

    rerender(
      <DisputeFlagStep
        {...defaultProps}
        reason="Other"
      />
    );

    expect(screen.getByPlaceholderText('Please describe your reason…')).toBeInTheDocument();
  });

  it('should call onCustomReasonChange when custom reason is typed', () => {
    const handleCustomReasonChange = vi.fn();
    render(
      <DisputeFlagStep
        {...defaultProps}
        reason="Other"
        onCustomReasonChange={handleCustomReasonChange}
      />
    );

    const textarea = screen.getByPlaceholderText('Please describe your reason…');
    fireEvent.change(textarea, { target: { value: 'Custom reason' } });

    expect(handleCustomReasonChange).toHaveBeenCalledWith('Custom reason');
  });

  it('should disable submit button when "Other" is selected without custom reason', () => {
    render(
      <DisputeFlagStep
        {...defaultProps}
        reason="Other"
        customReason=""
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit flag/i });
    expect(submitButton).toBeDisabled();
  });

  it('should enable submit button when "Other" has custom reason', () => {
    render(
      <DisputeFlagStep
        {...defaultProps}
        reason="Other"
        customReason="Custom reason"
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit flag/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('should call onSubmit when form is submitted with valid reason', () => {
    const handleSubmit = vi.fn();
    render(
      <DisputeFlagStep
        {...defaultProps}
        onSubmit={handleSubmit}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit flag/i });
    fireEvent.click(submitButton);

    expect(handleSubmit).toHaveBeenCalled();
  });

  it('should call onCancel when cancel button is clicked', () => {
    const handleCancel = vi.fn();
    render(
      <DisputeFlagStep
        {...defaultProps}
        onCancel={handleCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(handleCancel).toHaveBeenCalled();
  });

  it('should disable all inputs when loading', () => {
    render(
      <DisputeFlagStep
        {...defaultProps}
        reason="Other"
        customReason="reason"
        loading={true}
      />
    );

    const textareas = screen.getAllByRole('textbox');
    textareas.forEach(input => {
      expect(input).toBeDisabled();
    });

    const submitButton = screen.getByRole('button', { name: /submitting/i });
    expect(submitButton).toBeDisabled();
  });
});
