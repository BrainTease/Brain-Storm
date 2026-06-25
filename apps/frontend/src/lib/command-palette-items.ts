/**
 * Command palette items and utilities
 */

export interface Command {
  id: string;
  title: string;
  description?: string;
  category: 'navigation' | 'courses' | 'actions' | 'settings';
  icon?: string;
  onSelect: () => void | Promise<void>;
  keywords?: string[];
}

export const createNavigationCommands = (router: any): Command[] => [
  {
    id: 'nav-courses',
    title: 'Go to Courses',
    description: 'Browse all courses',
    category: 'navigation',
    icon: '📚',
    onSelect: () => router.push('/courses'),
    keywords: ['courses', 'browse', 'learning'],
  },
  {
    id: 'nav-dashboard',
    title: 'Go to Dashboard',
    description: 'View your learning progress',
    category: 'navigation',
    icon: '📊',
    onSelect: () => router.push('/dashboard'),
    keywords: ['dashboard', 'progress', 'my'],
  },
  {
    id: 'nav-leaderboard',
    title: 'Go to Leaderboard',
    description: 'View rankings and achievements',
    category: 'navigation',
    icon: '🏆',
    onSelect: () => router.push('/leaderboard'),
    keywords: ['leaderboard', 'rankings', 'scores'],
  },
  {
    id: 'nav-cohorts',
    title: 'Go to Cohorts',
    description: 'Study groups and community',
    category: 'navigation',
    icon: '👥',
    onSelect: () => router.push('/cohorts'),
    keywords: ['cohorts', 'groups', 'community'],
  },
  {
    id: 'nav-profile',
    title: 'Go to Profile',
    description: 'View your profile settings',
    category: 'navigation',
    icon: '👤',
    onSelect: () => router.push('/profile'),
    keywords: ['profile', 'settings', 'account'],
  },
  {
    id: 'nav-bookmarks',
    title: 'Go to Bookmarks',
    description: 'View your saved content',
    category: 'navigation',
    icon: '🔖',
    onSelect: () => router.push('/bookmarks'),
    keywords: ['bookmarks', 'saved', 'favorites'],
  },
  {
    id: 'nav-credentials',
    title: 'Go to Credentials',
    description: 'View your verified certificates',
    category: 'navigation',
    icon: '🎓',
    onSelect: () => router.push('/credentials'),
    keywords: ['credentials', 'certificates', 'achievements'],
  },
];

export const createActionCommands = (): Command[] => [
  {
    id: 'action-search',
    title: 'Focus Search',
    description: 'Open the search box',
    category: 'actions',
    icon: '🔍',
    onSelect: () => {
      const input = document.querySelector<HTMLInputElement>('input[placeholder*="earch"]');
      if (input) {
        input.focus();
        input.select();
      }
    },
    keywords: ['search', 'find'],
  },
  {
    id: 'action-help',
    title: 'Show Keyboard Shortcuts',
    description: 'Display all keyboard shortcuts',
    category: 'actions',
    icon: '⌨️',
    onSelect: () => {
      const event = new CustomEvent('open-shortcuts-help');
      document.dispatchEvent(event);
    },
    keywords: ['shortcuts', 'help', 'keyboard'],
  },
];

export const createCourseCommands = (courses: any[]): Command[] =>
  courses.slice(0, 5).map(course => ({
    id: `course-${course.id}`,
    title: course.title,
    description: `${course.level} • ${course.durationHours}h`,
    category: 'courses',
    icon: '📖',
    onSelect: () => {
      // Router will be called in component
    },
    keywords: [course.title.toLowerCase(), course.level, course.description?.toLowerCase() || ''],
  }));
