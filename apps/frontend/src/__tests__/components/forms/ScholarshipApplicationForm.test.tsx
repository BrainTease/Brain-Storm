import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScholarshipApplicationForm } from '@/components/forms/ScholarshipApplicationForm';

// Mock the useZodForm hook
vi.mock('@/components/forms/useZodForm', () => ({
  useZodForm: () => ({
    register: () => ({}),
    formState: { errors: {} },
    trigger: vi.fn(() => Promise.resolve(true)),
    watch: vi.fn(),
    getValues: vi.fn(),
  }),
}));

describe('ScholarshipApplicationForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockOnCancel.mockClear();
  });

  it('renders step 1 by default', () => {
    render(<ScholarshipApplicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
  });

  it('displays all three step indicators', () => {
    render(<ScholarshipApplicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    expect(screen.getByText('Personal Information')).toBeInTheDocument();
    expect(screen.getByText('Academic Details')).toBeInTheDocument();
    expect(screen.getByText('Essay & Agreement')).toBeInTheDocument();
  });

  it('renders step 1 fields', () => {
    render(<ScholarshipApplicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);
    expect(screen.getByPlaceholderText('John')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('john@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/\+1 \(555\) 000-0000/)).toBeInTheDocument();
  });

  it('shows previous button on step 2+', async () => {
    const user = userEvent.setup();
    render(<ScholarshipApplicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const nextButton = screen.getByRole('button', { name: 'Next Step' });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    });
  });

  it('renders step 2 fields after clicking next', async () => {
    const user = userEvent.setup();
    render(<ScholarshipApplicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const nextButton = screen.getByRole('button', { name: 'Next Step' });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Academic Details')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('University of Example')).toBeInTheDocument();
    });
  });

  it('shows Submit Application button on step 3', async () => {
    const user = userEvent.setup();
    render(<ScholarshipApplicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const nextButton1 = screen.getByRole('button', { name: 'Next Step' });
    await user.click(nextButton1);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Next Step' })).toBeInTheDocument();
    });

    const nextButton2 = screen.getByRole('button', { name: 'Next Step' });
    await user.click(nextButton2);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Submit Application' })).toBeInTheDocument();
    });
  });

  it('calls onCancel when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<ScholarshipApplicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('renders all step 3 fields', async () => {
    const user = userEvent.setup();
    render(<ScholarshipApplicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const nextButtons = screen.getAllByRole('button', { name: 'Next Step' });
    await user.click(nextButtons[0]);
    await user.click(nextButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Essay & Agreement')).toBeInTheDocument();
      expect(screen.getByText(/Explain your financial situation/)).toBeInTheDocument();
      expect(screen.getByText(/Why do you deserve this scholarship/)).toBeInTheDocument();
    });
  });

  it('has checkbox for agreement', async () => {
    const user = userEvent.setup();
    render(<ScholarshipApplicationForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const nextButtons = screen.getAllByRole('button', { name: 'Next Step' });
    await user.click(nextButtons[0]);
    await user.click(nextButtons[1]);

    await waitFor(() => {
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });
  });
});
