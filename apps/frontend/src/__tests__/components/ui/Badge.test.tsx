import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/Badge';

describe('Badge Component', () => {
  describe('variants', () => {
    it('should render default variant', () => {
      render(<Badge>Default Badge</Badge>);
      const badge = screen.getByText('Default Badge');
      expect(badge).toHaveClass('bg-gray-200', 'text-gray-800');
    });

    it('should render success variant', () => {
      render(<Badge variant="success">Success</Badge>);
      const badge = screen.getByText('Success');
      expect(badge).toHaveClass('bg-green-200', 'text-green-800');
    });

    it('should render warning variant', () => {
      render(<Badge variant="warning">Warning</Badge>);
      const badge = screen.getByText('Warning');
      expect(badge).toHaveClass('bg-yellow-200', 'text-yellow-800');
    });

    it('should render error variant', () => {
      render(<Badge variant="error">Error</Badge>);
      const badge = screen.getByText('Error');
      expect(badge).toHaveClass('bg-red-200', 'text-red-800');
    });
  });

  describe('styling', () => {
    it('should have common badge styling', () => {
      render(<Badge>Styled</Badge>);
      const badge = screen.getByText('Styled');
      expect(badge).toHaveClass('inline-block', 'px-3', 'py-1', 'rounded-full', 'text-sm', 'font-medium');
    });

    it('should apply custom className', () => {
      render(<Badge className="custom-class">Custom</Badge>);
      const badge = screen.getByText('Custom');
      expect(badge).toHaveClass('custom-class');
    });
  });

  describe('children', () => {
    it('should render text children', () => {
      render(<Badge>Text Content</Badge>);
      expect(screen.getByText('Text Content')).toBeInTheDocument();
    });

    it('should render JSX children', () => {
      render(
        <Badge>
          <span data-testid="nested">Nested</span>
        </Badge>
      );
      expect(screen.getByTestId('nested')).toBeInTheDocument();
    });
  });
});
