import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SelectInput } from '@/components/ui/form/SelectInput';

describe('SelectInput Component', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  describe('rendering', () => {
    it('should render select element', () => {
      render(<SelectInput label="Choose" options={options} />);
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('should render label', () => {
      render(<SelectInput label="Test Label" options={options} />);
      expect(screen.getByText('Test Label')).toBeInTheDocument();
    });

    it('should render all options', () => {
      render(<SelectInput label="Choose" options={options} />);
      expect(screen.getByRole('option', { name: 'Option 1' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Option 2' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Option 3' })).toBeInTheDocument();
    });
  });

  describe('placeholder option', () => {
    it('should render placeholder option when provided', () => {
      const placeholder = { value: '', label: 'Select...' };
      render(
        <SelectInput label="Choose" options={options} placeholderOption={placeholder} />
      );
      expect(screen.getByRole('option', { name: 'Select...' })).toBeInTheDocument();
    });

    it('should render placeholder as first option', () => {
      const placeholder = { value: '', label: 'Select...' };
      render(
        <SelectInput label="Choose" options={options} placeholderOption={placeholder} />
      );
      const combobox = screen.getByRole('combobox') as HTMLSelectElement;
      expect(combobox.options[0].textContent).toBe('Select...');
    });

    it('should not render placeholder when not provided', () => {
      render(<SelectInput label="Choose" options={options} />);
      // First option should be the first real option
      const combobox = screen.getByRole('combobox') as HTMLSelectElement;
      expect(combobox.options[0].textContent).toBe('Option 1');
    });
  });

  describe('value handling', () => {
    it('should handle initial value', () => {
      render(<SelectInput label="Choose" options={options} defaultValue="option2" />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('option2');
    });

    it('should handle change events', () => {
      const handleChange = vi.fn();
      render(<SelectInput label="Choose" options={options} onChange={handleChange} />);
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'option2' } });
      expect(handleChange).toHaveBeenCalled();
    });

    it('should be controlled by value prop', () => {
      const { rerender } = render(
        <SelectInput label="Choose" options={options} value="option1" readOnly />
      );
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('option1');

      rerender(<SelectInput label="Choose" options={options} value="option3" readOnly />);
      expect(select.value).toBe('option3');
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<SelectInput label="Choose" options={options} disabled />);
      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });

    it('should be enabled by default', () => {
      render(<SelectInput label="Choose" options={options} />);
      const select = screen.getByRole('combobox');
      expect(select).not.toBeDisabled();
    });
  });

  describe('error handling', () => {
    it('should display error message', () => {
      render(
        <SelectInput
          label="Choose"
          options={options}
          error="This field is required"
        />
      );
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });

    it('should have error styling when error is present', () => {
      const { container } = render(
        <SelectInput label="Choose" options={options} error="Error" />
      );
      const select = container.querySelector('select');
      expect(select).toHaveClass('border-red-500');
    });
  });

  describe('helper text', () => {
    it('should display helper text', () => {
      render(
        <SelectInput
          label="Choose"
          options={options}
          helperText="This is helper text"
        />
      );
      expect(screen.getByText('This is helper text')).toBeInTheDocument();
    });
  });

  describe('fullWidth', () => {
    it('should apply full width class when fullWidth is true', () => {
      const { container } = render(
        <SelectInput label="Choose" options={options} fullWidth />
      );
      const select = container.querySelector('select');
      expect(select).toHaveClass('w-full');
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to select element', () => {
      const ref = { current: null };
      render(<SelectInput label="Choose" options={options} ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLSelectElement);
    });
  });

  describe('accessibility', () => {
    it('should associate label with select', () => {
      render(
        <SelectInput label="Associated" options={options} id="test-select" />
      );
      const label = screen.getByText('Associated') as HTMLLabelElement;
      const select = screen.getByRole('combobox');
      expect(label.htmlFor).toBeTruthy();
      expect(select).toHaveAttribute('id');
    });

    it('should have aria-invalid when error exists', () => {
      render(
        <SelectInput label="Choose" options={options} error="Error" />
      );
      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
