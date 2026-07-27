import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/Button';

describe('Button Component', () => {
  describe('variants', () => {
    it('should render primary variant by default', () => {
      render(<Button>Primary Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-blue-700');
    });

    it('should render outline variant', () => {
      render(<Button variant="outline">Outline Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('border-2', 'border-blue-700');
    });

    it('should render secondary variant', () => {
      render(<Button variant="secondary">Secondary Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-gray-200');
    });

    it('should render danger variant', () => {
      render(<Button variant="danger">Danger Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-red-600');
    });
  });

  describe('disabled state', () => {
    it('should be disabled via isDisabled prop', () => {
      render(<Button isDisabled>Disabled Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should be disabled via disabled prop', () => {
      render(<Button disabled>Disabled Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('type attribute', () => {
    it('should default to button type', () => {
      render(<Button>Button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('should support submit type', () => {
      render(<Button type="submit">Submit</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'submit');
    });
  });

  describe('event handlers', () => {
    it('should call onClick handler', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click me</Button>);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });
});
