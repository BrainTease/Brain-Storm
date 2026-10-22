import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RadioGroup } from '@/components/ui/form/RadioGroup';

describe('RadioGroup Component', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' },
  ];

  describe('rendering', () => {
    it('should render all radio options', () => {
      render(<RadioGroup label="Choose" options={options} />);
      expect(screen.getByLabelText('Option 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Option 2')).toBeInTheDocument();
      expect(screen.getByLabelText('Option 3')).toBeInTheDocument();
    });

    it('should render group label', () => {
      render(<RadioGroup label="Test Group" options={options} />);
      expect(screen.getByText('Test Group')).toBeInTheDocument();
    });

    it('should render as fieldset with legend', () => {
      const { container } = render(<RadioGroup label="Group" options={options} />);
      const fieldset = container.querySelector('fieldset');
      expect(fieldset).toBeInTheDocument();
      expect(screen.getByText('Group')).toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('should select an option on click', () => {
      render(<RadioGroup label="Choose" options={options} />);
      const radio = screen.getByLabelText('Option 1') as HTMLInputElement;
      fireEvent.click(radio);
      expect(radio.checked).toBe(true);
    });

    it('should have only one option selected at a time', () => {
      render(<RadioGroup label="Choose" options={options} />);
      const radio1 = screen.getByLabelText('Option 1') as HTMLInputElement;
      const radio2 = screen.getByLabelText('Option 2') as HTMLInputElement;
      
      fireEvent.click(radio1);
      expect(radio1.checked).toBe(true);
      expect(radio2.checked).toBe(false);
      
      fireEvent.click(radio2);
      expect(radio1.checked).toBe(false);
      expect(radio2.checked).toBe(true);
    });

    it('should set initial value from value prop', () => {
      render(<RadioGroup label="Choose" options={options} value="option2" />);
      const radio2 = screen.getByLabelText('Option 2') as HTMLInputElement;
      expect(radio2.checked).toBe(true);
    });
  });

  describe('onChange callback', () => {
    it('should call onChange when option is selected', () => {
      const handleChange = vi.fn();
      render(<RadioGroup label="Choose" options={options} onChange={handleChange} />);
      const radio = screen.getByLabelText('Option 1');
      fireEvent.change(radio);
      expect(handleChange).toHaveBeenCalled();
    });

    it('should pass selected value to onChange', () => {
      const handleChange = vi.fn();
      render(<RadioGroup label="Choose" options={options} onChange={handleChange} />);
      const radio = screen.getByLabelText('Option 1');
      fireEvent.change(radio);
      expect(handleChange).toHaveBeenCalledWith('option1');
    });
  });

  describe('disabled state', () => {
    it('should disable all options when disabled is true', () => {
      render(<RadioGroup label="Choose" options={options} disabled />);
      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => {
        expect(radio).toBeDisabled();
      });
    });
  });

  describe('error handling', () => {
    it('should display error message', () => {
      render(<RadioGroup label="Choose" options={options} error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });
  });

  describe('helper text', () => {
    it('should display helper text', () => {
      render(
        <RadioGroup label="Choose" options={options} helperText="Select one option" />
      );
      expect(screen.getByText('Select one option')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper name attribute for grouping', () => {
      render(<RadioGroup label="Group" options={options} name="test-group" />);
      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => {
        expect(radio).toHaveAttribute('name', 'test-group');
      });
    });
  });
});
