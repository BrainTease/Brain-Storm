import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CircularProgress } from '@/components/ui/CircularProgress';

describe('CircularProgress Component', () => {
  describe('value display', () => {
    it('should display the progress value as percentage', () => {
      render(<CircularProgress value={50} />);
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should display 0% for zero value', () => {
      render(<CircularProgress value={0} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should display 100% for full value', () => {
      render(<CircularProgress value={100} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('sizing', () => {
    it('should use default size of 80', () => {
      render(<CircularProgress value={50} />);
      const svg = screen.getByRole('img', { hidden: true })?.parentElement || 
                   document.querySelector('svg');
      expect(svg).toHaveAttribute('width', '80');
      expect(svg).toHaveAttribute('height', '80');
    });

    it('should use custom size', () => {
      render(<CircularProgress value={50} size={100} />);
      const svg = document.querySelector('svg');
      expect(svg).toHaveAttribute('width', '100');
      expect(svg).toHaveAttribute('height', '100');
    });
  });

  describe('SVG structure', () => {
    it('should render background circle', () => {
      const { container } = render(<CircularProgress value={50} />);
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThanOrEqual(1);
    });

    it('should render progress circle', () => {
      const { container } = render(<CircularProgress value={50} />);
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThanOrEqual(2);
    });

    it('should have stroke-dasharray for progress', () => {
      const { container } = render(<CircularProgress value={75} size={80} strokeWidth={8} />);
      const circles = container.querySelectorAll('circle');
      const progressCircle = circles[1];
      expect(progressCircle).toHaveAttribute('stroke-dasharray');
      expect(progressCircle).toHaveAttribute('stroke-dashoffset');
    });
  });

  describe('styling', () => {
    it('should have background circle styling', () => {
      const { container } = render(<CircularProgress value={50} />);
      const circles = container.querySelectorAll('circle');
      const bgCircle = circles[0];
      expect(bgCircle).toHaveClass('stroke-gray-200', 'dark:stroke-gray-700');
    });

    it('should have progress circle styling', () => {
      const { container } = render(<CircularProgress value={50} />);
      const circles = container.querySelectorAll('circle');
      const progressCircle = circles[1];
      expect(progressCircle).toHaveClass('stroke-blue-500', 'transition-all', 'duration-500');
    });

    it('should have rotate transform on SVG', () => {
      const { container } = render(<CircularProgress value={50} />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('-rotate-90');
    });
  });

  describe('label', () => {
    it('should render label when provided', () => {
      render(<CircularProgress value={50} label="Loading" />);
      expect(screen.getByText('Loading')).toBeInTheDocument();
    });

    it('should not render label when not provided', () => {
      const { container } = render(<CircularProgress value={50} />);
      const labels = container.querySelectorAll('.text-xs');
      // Should only have percentage label, not additional label
      expect(screen.queryByText('Loading')).not.toBeInTheDocument();
    });

    it('should have label styling', () => {
      render(<CircularProgress value={50} label="Progress" />);
      const label = screen.getByText('Progress');
      expect(label).toHaveClass('text-xs', 'text-gray-600', 'dark:text-gray-400', 'text-center');
    });
  });

  describe('progress calculations', () => {
    it('should calculate correct stroke-dashoffset for 50%', () => {
      const { container } = render(
        <CircularProgress value={50} size={80} strokeWidth={8} />
      );
      const circles = container.querySelectorAll('circle');
      const progressCircle = circles[1];
      const r = (80 - 8) / 2;
      const circumference = 2 * Math.PI * r;
      const expectedOffset = circumference - (50 / 100) * circumference;
      const actualOffset = parseFloat(
        progressCircle.getAttribute('stroke-dashoffset') || '0'
      );
      expect(Math.abs(actualOffset - expectedOffset)).toBeLessThan(0.1);
    });
  });
});
