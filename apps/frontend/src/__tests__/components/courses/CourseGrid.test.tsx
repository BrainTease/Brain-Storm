import { cleanup, render, screen, fireEvent, within } from '@testing-library/react';
import type { AnchorHTMLAttributes, ComponentProps } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { CourseGrid } from '@/components/courses/CourseGrid';
import type { Course } from '@/hooks/useCourseSearch';
import { useCompareStore } from '@/store/compare.store';

vi.mock('next/link', async () => {
  const { forwardRef } = await import('react');
  return {
    default: forwardRef<
      HTMLAnchorElement,
      AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }
    >(({ href, children, ...props }, ref) => (
      <a href={href} ref={ref} {...props}>
        {children}
      </a>
    )),
  };
});

const cardRenders = vi.hoisted(() => ({ count: 0 }));

vi.mock('@/components/courses/CourseCard', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/courses/CourseCard')>();
  const { createElement } = await import('react');
  return {
    ...actual,
    CourseCard: (props: ComponentProps<typeof actual.CourseCard>) => {
      cardRenders.count++;
      return createElement(actual.CourseCard, props);
    },
  };
});

// jsdom does not implement matchMedia; the skeleton/spinner primitives query it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});

vi.stubGlobal(
  'IntersectionObserver',
  class {
    observe = vi.fn();
    disconnect = vi.fn();
  }
);

const courses: Course[] = [
  { id: '1', title: 'Intro to Stellar', level: 'beginner', durationHours: 3, rating: 4.5 },
  { id: '2', title: 'Soroban Contracts', level: 'intermediate', durationHours: 6, rating: 4.8 },
  { id: '3', title: 'DeFi on Stellar', level: 'advanced', durationHours: 9, rating: 4.2 },
];

const defaultProps = {
  courses,
  total: courses.length,
  isLoading: false,
  isLoadingMore: false,
  hasMore: false,
  onLoadMore: vi.fn(),
};

beforeEach(() => {
  cleanup();
  useCompareStore.setState({ selected: [] });
  vi.clearAllMocks();
});

describe('CourseGrid accessibility', () => {
  it('exposes results as a labelled list', () => {
    render(<CourseGrid {...defaultProps} />);
    const list = screen.getByRole('list', { name: 'Courses' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(courses.length);
  });

  it('announces the result count in a live region', () => {
    render(<CourseGrid {...defaultProps} />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('3 courses found');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('announces the empty state', () => {
    render(<CourseGrid {...defaultProps} courses={[]} total={0} />);
    expect(screen.getByRole('status')).toHaveTextContent('No courses match those filters.');
  });

  it('marks the list busy and announces loading while results are pending', () => {
    render(<CourseGrid {...defaultProps} courses={[]} total={0} isLoading />);
    expect(screen.getByRole('list', { name: 'Courses' })).toHaveAttribute('aria-busy', 'true');
    // Skeleton cards also expose role=status, so target the announced text.
    expect(screen.getByText('Loading courses…')).toHaveAttribute('role', 'status');
  });

  it('describes the available keyboard shortcuts', () => {
    render(<CourseGrid {...defaultProps} />);
    const list = screen.getByRole('list', { name: 'Courses' });
    const describedBy = list.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(/arrow keys/i);
  });

  it('reports load failures as an alert', () => {
    render(<CourseGrid {...defaultProps} error={new Error('Network down')} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Network down');
  });

  it('offers a keyboard-reachable alternative to infinite scroll', () => {
    const onLoadMore = vi.fn();
    render(<CourseGrid {...defaultProps} hasMore onLoadMore={onLoadMore} />);

    fireEvent.click(screen.getByRole('button', { name: /load more courses/i }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('hides the load-more button once the list is exhausted', () => {
    render(<CourseGrid {...defaultProps} />);
    expect(screen.queryByRole('button', { name: /load more courses/i })).not.toBeInTheDocument();
    expect(screen.getByText(/reached the end of the list/i)).toBeInTheDocument();
  });
});

describe('CourseGrid keyboard navigation', () => {
  function courseLinks() {
    return courses.map((c) => screen.getByRole('link', { name: c.title }));
  }

  it('keeps a single course in the tab sequence', () => {
    render(<CourseGrid {...defaultProps} />);
    const [first, second, third] = courseLinks();
    expect(first).toHaveAttribute('tabindex', '0');
    expect(second).toHaveAttribute('tabindex', '-1');
    expect(third).toHaveAttribute('tabindex', '-1');
  });

  it('moves between courses with the arrow keys', () => {
    render(<CourseGrid {...defaultProps} />);
    const list = screen.getByRole('list', { name: 'Courses' });
    const [first, second] = courseLinks();

    fireEvent.keyDown(list, { key: 'ArrowRight' });
    expect(second).toHaveFocus();

    fireEvent.keyDown(list, { key: 'ArrowLeft' });
    expect(first).toHaveFocus();
  });

  it('jumps to the last and first course with End and Home', () => {
    render(<CourseGrid {...defaultProps} />);
    const list = screen.getByRole('list', { name: 'Courses' });
    const [first, , third] = courseLinks();

    fireEvent.keyDown(list, { key: 'End' });
    expect(third).toHaveFocus();

    fireEvent.keyDown(list, { key: 'Home' });
    expect(first).toHaveFocus();
  });
});

describe('CourseGrid comparison controls', () => {
  it('labels each compare checkbox with its course', () => {
    render(<CourseGrid {...defaultProps} />);
    expect(screen.getByRole('checkbox', { name: 'Compare Intro to Stellar' })).toBeInTheDocument();
  });

  it('adds and removes a course from the comparison list', () => {
    render(<CourseGrid {...defaultProps} />);
    const checkbox = screen.getByRole('checkbox', { name: 'Compare Soroban Contracts' });

    fireEvent.click(checkbox);
    expect(useCompareStore.getState().selected.map((c) => c.id)).toEqual(['2']);

    fireEvent.click(checkbox);
    expect(useCompareStore.getState().selected).toHaveLength(0);
  });

  it('explains why comparison is unavailable once the list is full', () => {
    useCompareStore.setState({
      selected: ['a', 'b', 'c', 'd'].map((id) => ({ id, title: id, level: 'beginner' })),
    });
    render(<CourseGrid {...defaultProps} />);

    const checkbox = screen.getByRole('checkbox', {
      name: 'Compare Intro to Stellar — comparison list is full',
    });
    expect(checkbox).toBeDisabled();
  });
});

describe('CourseGrid render performance', () => {
  beforeEach(() => {
    cardRenders.count = 0;
  });

  it('does not re-render course cards when unrelated grid props change (#1287)', () => {
    const { rerender } = render(<CourseGrid {...defaultProps} />);
    const initialRenders = cardRenders.count;
    expect(initialRenders).toBe(courses.length);

    rerender(<CourseGrid {...defaultProps} onLoadMore={vi.fn()} />);

    expect(cardRenders.count).toBe(initialRenders);
  });
});
