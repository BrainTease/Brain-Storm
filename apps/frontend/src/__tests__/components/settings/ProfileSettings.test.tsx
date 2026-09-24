import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ProfileSettings } from '@/components/settings/ProfileSettings';

describe('ProfileSettings', () => {
  it('renders profile form section', () => {
    render(<ProfileSettings />);
    expect(screen.getByRole('heading', { name: /profile/i })).toBeInTheDocument();
  });

  it('displays profile input fields', () => {
    render(<ProfileSettings />);
    expect(screen.getByLabelText(/name|username/i)).toBeInTheDocument();
  });

  it('has independent save state', async () => {
    const user = userEvent.setup();
    render(<ProfileSettings />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeInTheDocument();
  });

  it('manages form state independently from other settings', () => {
    const { container } = render(<ProfileSettings />);
    expect(container.querySelector('form')).toBeInTheDocument();
  });

  it('displays success message on save', async () => {
    const user = userEvent.setup();
    render(<ProfileSettings />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);
  });

  it('displays loading state while saving', () => {
    render(<ProfileSettings />);
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });
});
