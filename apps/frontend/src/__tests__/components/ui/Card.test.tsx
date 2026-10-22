import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '@/components/ui/Card';

describe('Card Component', () => {
  describe('rendering', () => {
    it('should render a card with children', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should render as a div element', () => {
      const { container } = render(<Card>Test</Card>);
      const div = container.querySelector('div');
      expect(div).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('should have default card styling', () => {
      const { container } = render(<Card>Styled Card</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-white', 'dark:bg-gray-800', 'rounded-lg', 'shadow-md', 'p-6');
    });

    it('should apply custom className', () => {
      const { container } = render(<Card className="custom-card">Custom</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('custom-card');
    });

    it('should combine default and custom className', () => {
      const { container } = render(<Card className="mt-4">Combined</Card>);
      const card = container.firstChild as HTMLElement;
      expect(card).toHaveClass('bg-white', 'mt-4');
    });
  });

  describe('children', () => {
    it('should render text children', () => {
      render(<Card>Text content</Card>);
      expect(screen.getByText('Text content')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <Card>
          <h1>Title</h1>
          <p>Description</p>
        </Card>
      );
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
    });

    it('should render complex JSX children', () => {
      render(
        <Card>
          <div data-testid="nested-div">
            <button>Action</button>
          </div>
        </Card>
      );
      expect(screen.getByTestId('nested-div')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
