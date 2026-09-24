import { beforeEach, describe, expect, it } from 'vitest';

// eslint-disable-next-line import/no-unresolved
import { useBookmarksStore } from '@/store/bookmarks.store';

beforeEach(() => {
  localStorage.clear();
  useBookmarksStore.setState({
    bookmarks: [],
    loading: false,
  });
});

describe('bookmarks store', () => {
  it('persists bookmarks to localStorage', () => {
    const course = {
      id: 'course-1',
      title: 'React Basics',
      level: 'beginner',
    };

    useBookmarksStore.getState().addBookmark(course);

    const persisted = JSON.parse(localStorage.getItem('bookmarks') ?? '{}');
    expect(persisted.state.bookmarks).toContainEqual(course);
  });

  it('checks if a course is bookmarked', () => {
    const course = {
      id: 'course-1',
      title: 'React Basics',
      level: 'beginner',
    };

    useBookmarksStore.getState().addBookmark(course);

    expect(useBookmarksStore.getState().isBookmarked('course-1')).toBe(true);
    expect(useBookmarksStore.getState().isBookmarked('course-2')).toBe(false);
  });

  it('removes a bookmark from the list', () => {
    const course = {
      id: 'course-1',
      title: 'React Basics',
      level: 'beginner',
    };

    useBookmarksStore.getState().addBookmark(course);
    expect(useBookmarksStore.getState().bookmarks).toHaveLength(1);

    useBookmarksStore.getState().removeBookmark('course-1');
    expect(useBookmarksStore.getState().bookmarks).toHaveLength(0);
  });

  it('handles adding multiple bookmarks', () => {
    const course1 = {
      id: 'course-1',
      title: 'React Basics',
      level: 'beginner',
    };

    const course2 = {
      id: 'course-2',
      title: 'Advanced React',
      level: 'advanced',
    };

    useBookmarksStore.getState().addBookmark(course1);
    useBookmarksStore.getState().addBookmark(course2);

    expect(useBookmarksStore.getState().bookmarks).toHaveLength(2);
    expect(useBookmarksStore.getState().isBookmarked('course-1')).toBe(true);
    expect(useBookmarksStore.getState().isBookmarked('course-2')).toBe(true);
  });

  it('initializes with empty bookmarks array', () => {
    useBookmarksStore.setState({
      bookmarks: [],
      loading: false,
    });

    expect(useBookmarksStore.getState().bookmarks).toEqual([]);
    expect(useBookmarksStore.getState().loading).toBe(false);
  });
});
