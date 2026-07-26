import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import {
  CourseListControls,
  CourseProgressList,
  CredentialGrid,
  DashboardError,
  DashboardHeader,
  DashboardSection,
  EnrolledCourseList,
  QuickStats,
  RecentCredentialList,
  TokenBalanceCard,
} from '@/components/dashboard';
import type { EnrolledCourse } from '@/lib/dashboard';

const courses: EnrolledCourse[] = [
  { id: 'p-1', courseId: 'c-1', progressPct: 100, title: 'Stellar Basics', level: 'beginner' },
  { id: 'p-2', courseId: 'c-2', progressPct: 40, title: 'Advanced Soroban' },
];

const credentials = [
  { id: 'cr-1', courseId: 'c-1', issuedAt: '2026-02-01T00:00:00Z', course: { id: 'c-1', title: 'Stellar Basics' } },
  { id: 'cr-2', courseId: 'c-9', issuedAt: '2026-01-01T00:00:00Z' },
];

describe('DashboardHeader', () => {
  it('greets the user by username', () => {
    render(<DashboardHeader username="ada" email="ada@example.com" />);
    expect(screen.getByRole('heading', { name: /Welcome back, ada/i })).toBeInTheDocument();
  });

  it('falls back to the email, then to a generic greeting', () => {
    const { unmount } = render(<DashboardHeader email="ada@example.com" />);
    expect(screen.getByRole('heading', { name: /ada@example.com/i })).toBeInTheDocument();
    unmount();

    render(<DashboardHeader />);
    expect(screen.getByRole('heading', { name: /Welcome back, Student/i })).toBeInTheDocument();
  });

  it('shows the email only when asked', () => {
    const { unmount } = render(<DashboardHeader username="ada" email="ada@example.com" />);
    expect(screen.queryByText('ada@example.com')).not.toBeInTheDocument();
    unmount();

    render(<DashboardHeader username="ada" email="ada@example.com" showEmail />);
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  it('renders the greeting while loading if the identity is already known', () => {
    render(<DashboardHeader username="ada" isLoading />);
    expect(screen.getByRole('heading', { name: /Welcome back, ada/i })).toBeInTheDocument();
  });

  it('falls back to a skeleton when loading with no identity', () => {
    render(<DashboardHeader isLoading />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});

describe('DashboardError', () => {
  it('renders nothing without a message', () => {
    render(<DashboardError message={null} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('announces the message', () => {
    render(<DashboardError message="Boom" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
  });
});

describe('TokenBalanceCard', () => {
  it('shows the balance in BST', () => {
    render(<TokenBalanceCard balance={850} />);
    expect(screen.getByText('850 BST')).toBeInTheDocument();
  });

  it('treats a null balance as zero', () => {
    render(<TokenBalanceCard balance={null} />);
    expect(screen.getByText('0 BST')).toBeInTheDocument();
  });

  it('hides the value while loading', () => {
    render(<TokenBalanceCard balance={850} isLoading />);
    expect(screen.queryByText('850 BST')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /BST Token Balance/i })).toBeInTheDocument();
  });
});

describe('QuickStats', () => {
  const stats = { completed: 2, inProgress: 1, totalHours: 11, badges: 3 };

  it('renders one tile per metric', () => {
    render(<QuickStats stats={stats} tokenBalance={850} />);
    expect(screen.getByText('Courses Completed')).toBeInTheDocument();
    expect(screen.getByText('11h')).toBeInTheDocument();
    expect(screen.getByText('850')).toBeInTheDocument();
  });

  it('renders placeholders while loading', () => {
    render(<QuickStats stats={stats} tokenBalance={850} isLoading />);
    expect(screen.queryByText('Courses Completed')).not.toBeInTheDocument();
  });
});

describe('EnrolledCourseList', () => {
  it('links each course and badges its level', () => {
    render(<EnrolledCourseList courses={courses} />);
    expect(screen.getByRole('link', { name: 'Stellar Basics' })).toHaveAttribute(
      'href',
      '/courses/c-1'
    );
    expect(screen.getByText('beginner')).toBeInTheDocument();
  });

  it('marks completed courses', () => {
    render(<EnrolledCourseList courses={courses} />);
    expect(screen.getAllByLabelText('Completed')).toHaveLength(1);
  });

  it('offers a browse link when empty', () => {
    render(<EnrolledCourseList courses={[]} />);
    expect(screen.getByText('No courses found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Browse courses/i })).toHaveAttribute(
      'href',
      '/courses'
    );
  });
});

describe('CourseProgressList', () => {
  it('labels a finished course as completed', () => {
    render(<CourseProgressList courses={courses} />);
    expect(screen.getByText('🏆 Completed')).toBeInTheDocument();
    expect(screen.getByText('40% complete')).toBeInTheDocument();
  });

  it('shows an empty state', () => {
    render(<CourseProgressList courses={[]} />);
    expect(screen.getByText(/have not enrolled in any courses/i)).toBeInTheDocument();
  });
});

describe('CredentialGrid', () => {
  it('uses the course title, falling back to the id', () => {
    render(<CredentialGrid credentials={credentials} />);
    expect(screen.getByText('Stellar Basics')).toBeInTheDocument();
    expect(screen.getByText('Course c-9')).toBeInTheDocument();
  });

  it('shows an empty state', () => {
    render(<CredentialGrid credentials={[]} />);
    expect(screen.getByText(/earn your first certificate/i)).toBeInTheDocument();
  });
});

describe('RecentCredentialList', () => {
  it('lists each credential', () => {
    render(<RecentCredentialList credentials={credentials} />);
    expect(screen.getByText('Stellar Basics')).toBeInTheDocument();
    expect(screen.getByText('Course c-9')).toBeInTheDocument();
  });

  it('shows an empty state', () => {
    render(<RecentCredentialList credentials={[]} />);
    expect(screen.getByText(/have not earned any credentials/i)).toBeInTheDocument();
  });
});

describe('CourseListControls', () => {
  it('reports filter changes', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <CourseListControls
        filter="all"
        sort="progress"
        onFilterChange={onFilterChange}
        onSortChange={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Completed' }));
    expect(onFilterChange).toHaveBeenCalledWith('completed');
  });

  it('reports sort changes', async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    render(
      <CourseListControls
        filter="all"
        sort="progress"
        onFilterChange={vi.fn()}
        onSortChange={onSortChange}
      />
    );
    await user.selectOptions(screen.getByLabelText('Sort courses'), 'title');
    expect(onSortChange).toHaveBeenCalledWith('title');
  });
});

describe('DashboardSection', () => {
  it('names the landmark after the title', () => {
    render(
      <DashboardSection title="My Courses">
        <p>body</p>
      </DashboardSection>
    );
    expect(screen.getByRole('region', { name: 'My Courses' })).toBeInTheDocument();
  });

  it('prefers an explicit aria label and renders actions', () => {
    render(
      <DashboardSection title="My Courses" ariaLabel="Enrolled courses" actions={<button>Sort</button>}>
        <p>body</p>
      </DashboardSection>
    );
    expect(screen.getByRole('region', { name: 'Enrolled courses' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort' })).toBeInTheDocument();
  });
});
