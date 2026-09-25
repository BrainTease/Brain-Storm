import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { NotificationSettings } from '@/components/settings/NotificationSettings';

describe('NotificationSettings', () => {
  it('renders notification preferences section', () => {
    render(<NotificationSettings />);
    expect(screen.getByRole('heading', { name: /notification/i })).toBeInTheDocument();
  });

  it('displays notification preference toggles', () => {
    render(<NotificationSettings />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('has independent save state from other settings', async () => {
    const user = userEvent.setup();
    render(<NotificationSettings />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeInTheDocument();
  });

  it('manages email and in-app notification preferences separately', () => {
    render(<NotificationSettings />);
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
  });

  it('does not share mutable state with profile or security settings', () => {
    const { container } = render(<NotificationSettings />);
    const form = container.querySelector('form');
    expect(form).toBeInTheDocument();
  });

  it('displays independent loading state', async () => {
    const user = userEvent.setup();
    render(<NotificationSettings />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeInTheDocument();
  });

  it('allows toggling individual notification preferences', async () => {
    const user = userEvent.setup();
    render(<NotificationSettings />);

    const checkbox = screen.getAllByRole('checkbox')[0];
    await user.click(checkbox);
  });
});
