/**
 * Unit tests for form validation
 * Tests form input validation logic and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';

// Mock form validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const registerSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

// Mock form component for testing
function MockLoginForm({ onSubmit }: { onSubmit: (data: unknown) => void }) {
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formData, setFormData] = React.useState({ email: '', password: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = loginSchema.safeParse(formData);

    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          formattedErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(formattedErrors);
    } else {
      setErrors({});
      onSubmit(result.data);
    }
  };

  return (
    <form onSubmit={handleSubmit} data-testid="login-form">
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <span id="email-error" role="alert">
            {errors.email}
          </span>
        )}
      </div>
      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
        {errors.password && (
          <span id="password-error" role="alert">
            {errors.password}
          </span>
        )}
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}

describe('Form Validation', () => {
  describe('Login Form', () => {
    it('should validate email format', async () => {
      const mockSubmit = vi.fn();
      render(<MockLoginForm onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByText(/submit/i);

      await userEvent.type(emailInput, 'invalid-email');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('should validate password length', async () => {
      const mockSubmit = vi.fn();
      render(<MockLoginForm onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByText(/submit/i);

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'short');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });

      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('should submit with valid data', async () => {
      const mockSubmit = vi.fn();
      render(<MockLoginForm onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByText(/submit/i);

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'ValidPassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'ValidPassword123',
        });
      });
    });

    it('should clear errors when input is corrected', async () => {
      const mockSubmit = vi.fn();
      render(<MockLoginForm onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByText(/submit/i);

      // First, trigger error
      await userEvent.type(emailInput, 'invalid');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
      });

      // Then, correct the error
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, 'valid@example.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText(/invalid email address/i)).not.toBeInTheDocument();
      });
    });

    it('should show multiple errors simultaneously', async () => {
      const mockSubmit = vi.fn();
      render(<MockLoginForm onSubmit={mockSubmit} />);

      const submitButton = screen.getByText(/submit/i);

      // Submit empty form
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
        expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it('should have proper ARIA attributes on invalid fields', async () => {
      const mockSubmit = vi.fn();
      render(<MockLoginForm onSubmit={mockSubmit} />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByText(/submit/i);

      await userEvent.type(emailInput, 'invalid');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true');
        expect(emailInput).toHaveAttribute('aria-describedby', 'email-error');
      });
    });
  });

  describe('Registration Form Validation', () => {
    it('should validate password strength requirements', () => {
      const weakPassword = 'simple';
      const strongPassword = 'StrongPass123';

      expect(
        registerSchema.safeParse({
          email: 'test@example.com',
          username: 'testuser',
          password: weakPassword,
          confirmPassword: weakPassword,
        }).success
      ).toBe(false);

      expect(
        registerSchema.safeParse({
          email: 'test@example.com',
          username: 'testuser',
          password: strongPassword,
          confirmPassword: strongPassword,
        }).success
      ).toBe(true);
    });

    it('should validate password confirmation', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        username: 'testuser',
        password: 'Password123',
        confirmPassword: 'DifferentPassword123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some((e) => e.message.includes("don't match"))).toBe(true);
      }
    });

    it('should validate username length', () => {
      const result = registerSchema.safeParse({
        email: 'test@example.com',
        username: 'ab', // Too short
        password: 'Password123',
        confirmPassword: 'Password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some((e) => e.path[0] === 'username')).toBe(true);
      }
    });
  });

  describe('Schema Validation', () => {
    it('should validate email schema', () => {
      const validEmails = ['test@example.com', 'user.name@example.co.uk', 'user+tag@example.com'];

      const invalidEmails = ['invalid', '@example.com', 'user@', 'user name@example.com'];

      validEmails.forEach((email) => {
        expect(loginSchema.safeParse({ email, password: 'ValidPass123' }).success).toBe(true);
      });

      invalidEmails.forEach((email) => {
        expect(loginSchema.safeParse({ email, password: 'ValidPass123' }).success).toBe(false);
      });
    });

    it('should validate password strength', () => {
      const testCases = [
        { password: 'short', valid: false, reason: 'too short' },
        { password: 'nouppercase123', valid: false, reason: 'no uppercase' },
        { password: 'NOLOWERCASE123', valid: false, reason: 'no lowercase (implicit in test)' },
        { password: 'NoNumbers', valid: false, reason: 'no numbers' },
        { password: 'ValidPass123', valid: true, reason: 'meets all requirements' },
      ];

      testCases.forEach(({ password, valid }) => {
        const result = registerSchema.shape.password.safeParse(password);
        expect(result.success).toBe(valid);
      });
    });
  });
});
