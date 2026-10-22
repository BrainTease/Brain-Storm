import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TextInput } from '@/components/ui/form/TextInput';

describe('TextInput Component', () => {
  describe('rendering', () => {
    it('should render text input by default', () => {
      render(<TextInput label="Username" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should render with different input types', () => {
      render(<TextInput label="Email" type="email" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('type', 'email');
    });

    it('should render label', () => {
      render(<TextInput label="Test Label" />);
      expect(screen.getByText('Test Label')).toBeInTheDocument();
    });
  });

  describe('value handling', () => {
    it('should handle initial value', () => {
      render(<TextInput label="Input" defaultValue="Initial" />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('Initial');
    });

    it('should handle change events', () => {
      const handleChange = vi.fn();
      render(<TextInput label="Input" onChange={handleChange} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'new value' } });
      expect(handleChange).toHaveBeenCalled();
    });

    it('should be controlled by value prop', () => {
      const { rerender } = render(<TextInput label="Input" value="initial" readOnly />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      expect(input.value).toBe('initial');

      rerender(<TextInput label="Input" value="updated" readOnly />);
      expect(input.value).toBe('updated');
    });
  });

  describe('placeholder', () => {
    it('should support placeholder attribute', () => {
      render(<TextInput label="Input" placeholder="Enter text" />);
      const input = screen.getByPlaceholderText('Enter text');
      expect(input).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<TextInput label="Input" disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should be enabled by default', () => {
      render(<TextInput label="Input" />);
      const input = screen.getByRole('textbox');
      expect(input).not.toBeDisabled();
    });
  });

  describe('error handling', () => {
    it('should display error message', () => {
      render(<TextInput label="Input" error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should have error styling when error is present', () => {
      const { container } = render(<TextInput label="Input" error="Error" />);
      const input = container.querySelector('input');
      expect(input).toHaveClass('border-red-500');
    });
  });

  describe('helper text', () => {
    it('should display helper text', () => {
      render(<TextInput label="Input" helperText="This is helper text" />);
      expect(screen.getByText('This is helper text')).toBeInTheDocument();
    });
  });

  describe('fullWidth', () => {
    it('should apply full width class when fullWidth is true', () => {
      const { container } = render(<TextInput label="Input" fullWidth />);
      const input = container.querySelector('input');
      expect(input).toHaveClass('w-full');
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to input element', () => {
      const ref = { current: null };
      render(<TextInput label="Input" ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });
  });

  describe('accessibility', () => {
    it('should associate label with input', () => {
      render(<TextInput label="Associated" id="test-input" />);
      const label = screen.getByText('Associated') as HTMLLabelElement;
      const input = screen.getByRole('textbox');
      expect(label.htmlFor).toBeTruthy();
      expect(input).toHaveAttribute('id');
    });

    it('should have aria-invalid when error exists', () => {
      render(<TextInput label="Input" error="Error" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
