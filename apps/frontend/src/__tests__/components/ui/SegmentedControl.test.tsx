import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentedControl } from '@/components/ui/form/SegmentedControl';

describe('SegmentedControl Component', () => {
  const options = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
  ];

  describe('rendering', () => {
    it('should render all options as buttons', () => {
      render(<SegmentedControl options={options} value="week" onChange={() => {}} />);
      expect(screen.getByRole('button', { name: 'Week' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Month' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Year' })).toBeInTheDocument();
    });

    it('should render as button group', () => {
      const { container } = render(
        <SegmentedControl options={options} value="week" onChange={() => {}} />
      );
      const group = container.querySelector('[role="group"]');
      expect(group).toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('should highlight selected option', () => {
      render(<SegmentedControl options={options} value="month" onChange={() => {}} />);
      const button = screen.getByRole('button', { name: 'Month' });
      expect(button).toHaveAttribute('aria-pressed', 'true');
    });

    it('should not highlight non-selected options', () => {
      render(<SegmentedControl options={options} value="month" onChange={() => {}} />);
      const weekBtn = screen.getByRole('button', { name: 'Week' });
      const yearBtn = screen.getByRole('button', { name: 'Year' });
      expect(weekBtn).toHaveAttribute('aria-pressed', 'false');
      expect(yearBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('should update selection on click', () => {
      const handleChange = vi.fn();
      const { rerender } = render(
        <SegmentedControl options={options} value="week" onChange={handleChange} />
      );
      const button = screen.getByRole('button', { name: 'Month' });
      fireEvent.click(button);
      expect(handleChange).toHaveBeenCalledWith('month');

      rerender(
        <SegmentedControl options={options} value="month" onChange={handleChange} />
      );
      expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
    });
  });

  describe('onChange callback', () => {
    it('should call onChange when option is clicked', () => {
      const handleChange = vi.fn();
      render(<SegmentedControl options={options} value="week" onChange={handleChange} />);
      const button = screen.getByRole('button', { name: 'Month' });
      fireEvent.click(button);
      expect(handleChange).toHaveBeenCalledWith('month');
    });

    it('should not call onChange when same option is clicked', () => {
      const handleChange = vi.fn();
      render(<SegmentedControl options={options} value="week" onChange={handleChange} />);
      const button = screen.getByRole('button', { name: 'Week' });
      fireEvent.click(button);
      expect(handleChange).not.toHaveBeenCalled();
    });
  });

  describe('disabled state', () => {
    it('should disable all buttons when disabled is true', () => {
      render(
        <SegmentedControl options={options} value="week" onChange={() => {}} disabled />
      );
      const buttons = screen.getAllByRole('button');
      buttons.forEach((btn) => {
        expect(btn).toBeDisabled();
      });
    });

    it('should be enabled by default', () => {
      render(<SegmentedControl options={options} value="week" onChange={() => {}} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((btn) => {
        expect(btn).not.toBeDisabled();
      });
    });
  });

  describe('styling', () => {
    it('should apply segmented control styling', () => {
      const { container } = render(
        <SegmentedControl options={options} value="week" onChange={() => {}} />
      );
      const group = container.querySelector('[role="group"]');
      expect(group).toHaveClass('inline-flex', 'rounded-lg', 'bg-gray-200');
    });

    it('should apply button styling', () => {
      render(<SegmentedControl options={options} value="week" onChange={() => {}} />);
      const button = screen.getByRole('button', { name: 'Week' });
      expect(button).toHaveClass('px-4', 'py-2', 'text-sm', 'font-medium');
    });
  });

  describe('accessibility', () => {
    it('should have aria-pressed attribute on buttons', () => {
      render(<SegmentedControl options={options} value="week" onChange={() => {}} />);
      const buttons = screen.getAllByRole('button');
      buttons.forEach((btn) => {
        expect(btn).toHaveAttribute('aria-pressed');
      });
    });

    it('should have group role', () => {
      const { container } = render(
        <SegmentedControl options={options} value="week" onChange={() => {}} />
      );
      const group = container.querySelector('[role="group"]');
      expect(group).toHaveAttribute('role', 'group');
    });
  });
});
