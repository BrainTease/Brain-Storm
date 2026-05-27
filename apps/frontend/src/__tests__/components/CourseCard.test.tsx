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
});
