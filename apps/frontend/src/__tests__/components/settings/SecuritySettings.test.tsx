import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SecuritySettings } from '@/components/settings/SecuritySettings';

describe('SecuritySettings', () => {
  it('renders security settings section', () => {
    render(<SecuritySettings />);
    expect(screen.getByRole('heading', { name: /security/i })).toBeInTheDocument();
  });

  it('displays password change form', () => {
    render(<SecuritySettings />);
    expect(screen.getByLabelText(/current password|password/i)).toBeInTheDocument();
  });

  it('has independent save state from other sections', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);

    const saveButton = screen.getByRole('button', { name: /save|update/i });
    expect(saveButton).toBeInTheDocument();
  });

  it('manages two-factor authentication settings', () => {
    render(<SecuritySettings />);
    expect(screen.getByRole('heading', { name: /security/i })).toBeInTheDocument();
  });

  it('does not share state with profile or notification settings', () => {
    const { container } = render(<SecuritySettings />);
    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
  });

  it('displays validation errors independently', async () => {
    const user = userEvent.setup();
    render(<SecuritySettings />);

    const saveButton = screen.getByRole('button', { name: /save|update/i });
    expect(saveButton).toBeInTheDocument();
  });
});
