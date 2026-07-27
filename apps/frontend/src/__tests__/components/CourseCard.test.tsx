import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CourseCard } from '@/components/courses/CourseCard';

const props = {
  id: '1',
  title: 'Intro to Stellar',
  description: 'Learn Stellar blockchain basics.',
  instructor: 'Alice Johnson',
  rating: 4.5,
  reviewCount: 200,
  level: 'beginner' as const,
  durationHours: 5,
  price: 29.99,
};

describe('CourseCard', () => {
  it('renders title as a link', () => {
    render(<CourseCard {...props} />);
    const link = screen.getByRole('link', { name: props.title });
    expect(link).toHaveAttribute('href', `/courses/${props.id}`);
  });

  it('renders instructor name', () => {
    render(<CourseCard {...props} />);
    expect(screen.getByText(props.instructor)).toBeInTheDocument();
  });

  it('renders level badge', () => {
    render(<CourseCard {...props} />);
    expect(screen.getByText('beginner')).toBeInTheDocument();
  });

  it('renders rating', () => {
    render(<CourseCard {...props} />);
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('renders review count', () => {
    render(<CourseCard {...props} />);
    expect(screen.getByText('(200)')).toBeInTheDocument();
  });

  it('renders price', () => {
    render(<CourseCard {...props} />);
    expect(screen.getByText('$29.99')).toBeInTheDocument();
  });

  it('renders Free when price is 0', () => {
    render(<CourseCard {...props} price={0} />);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('renders duration', () => {
    render(<CourseCard {...props} />);
    expect(screen.getByLabelText(/Duration: 5 hours/i)).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<CourseCard {...props} />);
    expect(screen.getByText(props.description)).toBeInTheDocument();
  });

  it('has accessible article label', () => {
    render(<CourseCard {...props} />);
    expect(screen.getByRole('article', { name: `Course: ${props.title}` })).toBeInTheDocument();
  });

  describe('accessibility', () => {
    it('exposes the star rating as a single labelled image', () => {
      render(<CourseCard {...props} />);
      expect(screen.getByRole('img', { name: 'Rating: 4.5 out of 5' })).toBeInTheDocument();
    });

    it('labels the enrollment count', () => {
      render(<CourseCard {...props} enrollmentCount={1200} />);
      expect(screen.getByRole('img', { name: '1200 students enrolled' })).toBeInTheDocument();
    });

    it('prefixes ambiguous values for screen readers', () => {
      render(<CourseCard {...props} category="DeFi" />);
      expect(screen.getByText('Level:')).toBeInTheDocument();
      expect(screen.getByText('Category:')).toBeInTheDocument();
      expect(screen.getByText('Price:')).toBeInTheDocument();
      expect(screen.getByText('Instructor:')).toBeInTheDocument();
    });

    it('spells out the review count rather than leaving it in parentheses', () => {
      render(<CourseCard {...props} />);
      expect(screen.getByText('Based on 200 reviews')).toBeInTheDocument();
    });

    it('gives the thumbnail a descriptive alt text', () => {
      render(<CourseCard {...props} imageUrl="/thumb.png" />);
      expect(screen.getByRole('img', { name: `${props.title} course thumbnail` })).toBeInTheDocument();
    });

    it('keeps the title link tabbable by default', () => {
      render(<CourseCard {...props} />);
      expect(screen.getByRole('link', { name: props.title })).not.toHaveAttribute('tabindex', '-1');
    });

    it('applies roving-focus wiring supplied by a container', () => {
      render(<CourseCard {...props} linkFocusProps={{ tabIndex: -1 }} />);
      expect(screen.getByRole('link', { name: props.title })).toHaveAttribute('tabindex', '-1');
    });

    it('renders a comparison control when one is provided', () => {
      render(<CourseCard {...props} compareControl={<button>Compare</button>} />);
      expect(screen.getByRole('button', { name: 'Compare' })).toBeInTheDocument();
    });
  });
});
