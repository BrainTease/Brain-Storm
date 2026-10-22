import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from '@/components/ui/form/Checkbox';

describe('Checkbox Component', () => {
  describe('rendering', () => {
    it('should render checkbox input', () => {
      render(<Checkbox label="Accept" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('type', 'checkbox');
    });

    it('should render label', () => {
      render(<Checkbox label="Test Label" />);
      expect(screen.getByText('Test Label')).toBeInTheDocument();
    });

    it('should render without label', () => {
      render(<Checkbox />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });
  });

  describe('variants', () => {
    it('should render inline variant by default', () => {
      const { container } = render(<Checkbox label="Inline" />);
      const wrapper = container.querySelector('.flex.items-center.gap-2');
      expect(wrapper).toBeInTheDocument();
    });

    it('should render row variant', () => {
      const { container } = render(<Checkbox label="Row" variant="row" />);
      const label = screen.getByText('Row') as HTMLLabelElement;
      expect(label.parentElement).toHaveClass('flex', 'items-center', 'justify-between');
    });

    it('should have row styling when variant is row', () => {
      const { container } = render(<Checkbox label="Toggle" variant="row" />);
      const label = screen.getByText('Toggle') as HTMLLabelElement;
      expect(label).toHaveClass('flex', 'items-center', 'justify-between', 'px-4', 'py-3');
    });
  });

  describe('state', () => {
    it('should be checked when checked prop is true', () => {
      render(<Checkbox label="Check" defaultChecked={true} />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should be unchecked by default', () => {
      render(<Checkbox label="Check" />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should toggle on click', () => {
      render(<Checkbox label="Check" />);
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
      fireEvent.click(checkbox);
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Checkbox label="Check" disabled />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDisabled();
    });

    it('should be enabled by default', () => {
      render(<Checkbox label="Check" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeDisabled();
    });
  });

  describe('error handling', () => {
    it('should display error message', () => {
      render(<Checkbox label="Check" error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should have error styling when error is present', () => {
      const { container } = render(<Checkbox label="Check" error="Error" />);
      const input = container.querySelector('input[type="checkbox"]');
      expect(input).toHaveClass('border-red-500');
    });
  });

  describe('helper text', () => {
    it('should display helper text', () => {
      render(<Checkbox label="Check" helperText="This is helper text" />);
      expect(screen.getByText('This is helper text')).toBeInTheDocument();
    });
  });

  describe('event handlers', () => {
    it('should call onChange when toggled', () => {
      const handleChange = vi.fn();
      render(<Checkbox label="Check" onChange={handleChange} />);
      const checkbox = screen.getByRole('checkbox');
      fireEvent.change(checkbox, { target: { checked: true } });
      expect(handleChange).toHaveBeenCalled();
    });

    it('should pass change event to handler', () => {
      const handleChange = vi.fn();
      render(<Checkbox label="Check" onChange={handleChange} />);
      const checkbox = screen.getByRole('checkbox');
      fireEvent.change(checkbox);
      expect(handleChange).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to checkbox element', () => {
      const ref = { current: null };
      render(<Checkbox label="Check" ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLInputElement);
      expect((ref.current as HTMLInputElement).type).toBe('checkbox');
    });
  });

  describe('accessibility', () => {
    it('should associate label with checkbox', () => {
      render(<Checkbox label="Associated" id="test-check" />);
      const label = screen.getByText('Associated') as HTMLLabelElement;
      const checkbox = screen.getByRole('checkbox');
      expect(label.htmlFor).toBeTruthy();
      expect(checkbox).toHaveAttribute('id');
    });

    it('should have aria-invalid when error exists', () => {
      render(<Checkbox label="Check" error="Error" />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
