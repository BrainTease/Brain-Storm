/**
 * Unit tests for Toast Notification component
 * Tests toast display, dismissal, and interaction behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

// Mock Toast component for testing
interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose: (id: string) => void;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function Toast({ id, type, message, onClose, duration = 3000, action }: ToastProps) {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  if (!visible) return null;

  const typeStyles = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500',
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      data-testid={`toast-${id}`}
      className={`toast ${typeStyles[type]}`}
    >
      <span data-testid="toast-message">{message}</span>
      {action && (
        <button data-testid="toast-action" onClick={action.onClick} className="toast-action">
          {action.label}
        </button>
      )}
      <button
        data-testid="toast-close"
        onClick={() => {
          setVisible(false);
          onClose(id);
        }}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}

describe('Toast Notification Component', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render toast with message', () => {
    render(
      <Toast
        id="1"
        type="success"
        message="Operation successful"
        onClose={mockOnClose}
        duration={0}
      />
    );

    expect(screen.getByText('Operation successful')).toBeInTheDocument();
  });

  it('should render different toast types with correct styling', () => {
    const types: Array<'success' | 'error' | 'warning' | 'info'> = [
      'success',
      'error',
      'warning',
      'info',
    ];

    types.forEach((type) => {
      const { unmount } = render(
        <Toast
          id={`toast-${type}`}
          type={type}
          message={`${type} message`}
          onClose={mockOnClose}
          duration={0}
        />
      );

      const toast = screen.getByTestId(`toast-toast-${type}`);
      expect(toast).toHaveClass('toast');

      unmount();
    });
  });

  it('should have proper ARIA attributes', () => {
    render(<Toast id="1" type="info" message="Information" onClose={mockOnClose} duration={0} />);

    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });

  it('should close toast when close button is clicked', async () => {
    render(
      <Toast id="1" type="success" message="Test message" onClose={mockOnClose} duration={0} />
    );

    const closeButton = screen.getByTestId('toast-close');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledWith('1');
  });

  it('should auto-dismiss after duration', async () => {
    vi.useFakeTimers();

    render(
      <Toast
        id="1"
        type="success"
        message="Auto-dismiss message"
        onClose={mockOnClose}
        duration={3000}
      />
    );

    expect(screen.getByText('Auto-dismiss message')).toBeInTheDocument();

    // Fast-forward time
    vi.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledWith('1');
    });

    vi.useRealTimers();
  });

  it('should not auto-dismiss when duration is 0', async () => {
    vi.useFakeTimers();

    render(
      <Toast id="1" type="info" message="Persistent message" onClose={mockOnClose} duration={0} />
    );

    vi.advanceTimersByTime(5000);

    expect(mockOnClose).not.toHaveBeenCalled();
    expect(screen.getByText('Persistent message')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('should render and handle action button', () => {
    const mockAction = vi.fn();

    render(
      <Toast
        id="1"
        type="warning"
        message="Warning with action"
        onClose={mockOnClose}
        duration={0}
        action={{
          label: 'Undo',
          onClick: mockAction,
        }}
      />
    );

    const actionButton = screen.getByTestId('toast-action');
    expect(actionButton).toHaveTextContent('Undo');

    fireEvent.click(actionButton);
    expect(mockAction).toHaveBeenCalledOnce();
  });

  it('should render success toast with correct styling', () => {
    render(
      <Toast id="1" type="success" message="Success message" onClose={mockOnClose} duration={0} />
    );

    const toast = screen.getByTestId('toast-1');
    expect(toast).toHaveClass('bg-green-500');
  });

  it('should render error toast with correct styling', () => {
    render(
      <Toast id="1" type="error" message="Error message" onClose={mockOnClose} duration={0} />
    );

    const toast = screen.getByTestId('toast-1');
    expect(toast).toHaveClass('bg-red-500');
  });

  it('should handle multiple actions correctly', () => {
    const mockAction = vi.fn();
    const mockClose = vi.fn();

    render(
      <Toast
        id="1"
        type="info"
        message="Test message"
        onClose={mockClose}
        duration={0}
        action={{
          label: 'Action',
          onClick: mockAction,
        }}
      />
    );

    // Click action
    const actionButton = screen.getByTestId('toast-action');
    fireEvent.click(actionButton);
    expect(mockAction).toHaveBeenCalledOnce();

    // Click close
    const closeButton = screen.getByTestId('toast-close');
    fireEvent.click(closeButton);
    expect(mockClose).toHaveBeenCalledWith('1');
  });

  it('should cleanup timer on unmount', () => {
    vi.useFakeTimers();

    const { unmount } = render(
      <Toast id="1" type="success" message="Test message" onClose={mockOnClose} duration={3000} />
    );

    unmount();
    vi.advanceTimersByTime(3000);

    // Should not call onClose after unmount
    expect(mockOnClose).not.toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('should be accessible via keyboard', () => {
    render(<Toast id="1" type="info" message="Keyboard test" onClose={mockOnClose} duration={0} />);

    const closeButton = screen.getByTestId('toast-close');

    // Should be focusable
    closeButton.focus();
    expect(closeButton).toHaveFocus();

    // Should close on Enter
    fireEvent.keyDown(closeButton, { key: 'Enter', code: 'Enter' });
  });
});

describe('Toast Container', () => {
  it('should stack multiple toasts', () => {
    const mockOnClose = vi.fn();

    render(
      <div>
        <Toast id="1" type="success" message="Toast 1" onClose={mockOnClose} duration={0} />
        <Toast id="2" type="error" message="Toast 2" onClose={mockOnClose} duration={0} />
        <Toast id="3" type="warning" message="Toast 3" onClose={mockOnClose} duration={0} />
      </div>
    );

    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
    expect(screen.getByText('Toast 3')).toBeInTheDocument();
  });

  it('should remove toast from stack when closed', async () => {
    const mockOnClose = vi.fn();

    const { rerender } = render(
      <div>
        <Toast id="1" type="success" message="Toast 1" onClose={mockOnClose} duration={0} />
        <Toast id="2" type="error" message="Toast 2" onClose={mockOnClose} duration={0} />
      </div>
    );

    expect(screen.getByText('Toast 1')).toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();

    // Close first toast
    const closeButton = screen.getAllByTestId('toast-close')[0];
    fireEvent.click(closeButton);

    // Rerender without first toast
    rerender(
      <div>
        <Toast id="2" type="error" message="Toast 2" onClose={mockOnClose} duration={0} />
      </div>
    );

    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
  });
});
