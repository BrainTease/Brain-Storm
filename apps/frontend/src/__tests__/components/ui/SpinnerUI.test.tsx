import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '@/components/ui/Spinner';

describe('Spinner Component', () => {
  describe('accessibility', () => {
    it('should have role status', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
    });

    it('should have default aria-label', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading…');
    });

    it('should use custom label', () => {
      render(<Spinner label="Loading content..." />);
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveAttribute('aria-label', 'Loading content...');
    });

    it('should have aria-hidden SVG', () => {
      render(<Spinner />);
      const svg = screen.getByRole('status').querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('sizes', () => {
    it('should render small size', () => {
      render(<Spinner size="sm" />);
      const svg = screen.getByRole('status').querySelector('svg');
      expect(svg).toHaveClass('h-4', 'w-4');
    });

    it('should render medium size by default', () => {
      render(<Spinner />);
      const svg = screen.getByRole('status').querySelector('svg');
      expect(svg).toHaveClass('h-8', 'w-8');
    });

    it('should render large size', () => {
      render(<Spinner size="lg" />);
      const svg = screen.getByRole('status').querySelector('svg');
      expect(svg).toHaveClass('h-12', 'w-12');
    });
  });

  describe('styling', () => {
    it('should have spin animation', () => {
      render(<Spinner />);
      const svg = screen.getByRole('status').querySelector('svg');
      expect(svg).toHaveClass('animate-spin');
    });

    it('should have blue color', () => {
      render(<Spinner />);
      const svg = screen.getByRole('status').querySelector('svg');
      expect(svg).toHaveClass('text-blue-600', 'dark:text-blue-400');
    });

    it('should have flex centering', () => {
      render(<Spinner />);
      const span = screen.getByRole('status');
      expect(span).toHaveClass('inline-flex', 'items-center', 'justify-center');
    });
  });

  describe('structure', () => {
    it('should render an SVG element', () => {
      render(<Spinner />);
      const svg = screen.getByRole('status').querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should have circle and path elements', () => {
      render(<Spinner />);
      const spinner = screen.getByRole('status');
      const circle = spinner.querySelector('circle');
      const path = spinner.querySelector('path');
      expect(circle).toBeInTheDocument();
      expect(path).toBeInTheDocument();
    });
  });
});
