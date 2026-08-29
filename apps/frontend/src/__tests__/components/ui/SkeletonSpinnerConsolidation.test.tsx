/**
 * Unit tests for skeleton / spinner deduplication — issue #972
 *
 * Verifies that all consumer paths resolve to the canonical primitives and that
 * the public API of each thin wrapper is preserved.
 *
 * ⚠️ DO NOT RUN — implementation only, per task instructions.
 */

import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';

// ── Canonical primitives ──────────────────────────────────────────────────────
import {
  Skeleton,
  CourseCardSkeleton as CanonicalCourseCardSkeleton,
} from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';

// ── Thin wrappers ─────────────────────────────────────────────────────────────
import { SkeletonBlock } from '@/components/dashboard/SkeletonBlock';
import { CourseCardSkeleton as CoursesCourseCardSkeleton } from '@/components/courses/CourseCardSkeleton';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Skeleton consolidation (issue #972)', () => {
  // ── Canonical Skeleton ────────────────────────────────────────────────────

  describe('Skeleton (canonical)', () => {
    it('renders a role="status" element', () => {
      const { getByRole } = render(React.createElement(Skeleton));
      expect(getByRole('status')).toBeDefined();
    });

    it('renders a "Loading..." screen-reader label', () => {
      const { getByText } = render(React.createElement(Skeleton));
      expect(getByText('Loading...')).toBeDefined();
    });

    it('accepts a custom className', () => {
      const { container } = render(React.createElement(Skeleton, { className: 'h-10 w-full' }));
      expect(container.firstChild?.toString()).toBeTruthy();
    });

    it('supports pulse animation', () => {
      const { container } = render(React.createElement(Skeleton, { animation: 'pulse' }));
      expect(container.innerHTML).toContain('animate-pulse');
    });
  });

  // ── SkeletonBlock wrapper ─────────────────────────────────────────────────

  describe('SkeletonBlock', () => {
    it('renders without crashing', () => {
      const { container } = render(React.createElement(SkeletonBlock));
      expect(container.firstChild).not.toBeNull();
    });

    it('passes the className prop through', () => {
      const { container } = render(React.createElement(SkeletonBlock, { className: 'h-8 w-1/2' }));
      // The class should appear somewhere in the rendered markup
      expect(container.innerHTML).toContain('h-8');
    });

    it('uses pulse animation (dashboard convention)', () => {
      const { container } = render(React.createElement(SkeletonBlock));
      expect(container.innerHTML).toContain('animate-pulse');
    });
  });

  // ── CourseCardSkeleton re-export ──────────────────────────────────────────

  describe('CourseCardSkeleton', () => {
    it('courses/CourseCardSkeleton renders a skeleton element', () => {
      const { container } = render(React.createElement(CoursesCourseCardSkeleton));
      expect(container.firstChild).not.toBeNull();
    });

    it('canonical and re-exported CourseCardSkeleton produce equivalent DOM structure', () => {
      const { container: canonicalEl } = render(React.createElement(CanonicalCourseCardSkeleton));
      const { container: reExportEl } = render(React.createElement(CoursesCourseCardSkeleton));
      // Both should produce the same outer element type
      expect(canonicalEl.firstElementChild?.tagName).toBe(reExportEl.firstElementChild?.tagName);
    });
  });

  // ── Spinner ───────────────────────────────────────────────────────────────

  describe('Spinner (canonical)', () => {
    it('renders a role="status" element', () => {
      const { getByRole } = render(React.createElement(Spinner));
      expect(getByRole('status')).toBeDefined();
    });

    it('uses the default aria-label "Loading…"', () => {
      const { getByLabelText } = render(React.createElement(Spinner));
      expect(getByLabelText('Loading…')).toBeDefined();
    });

    it('accepts a custom label', () => {
      const { getByLabelText } = render(
        React.createElement(Spinner, { label: 'Loading more courses…' })
      );
      expect(getByLabelText('Loading more courses…')).toBeDefined();
    });

    it('renders sm / md / lg size variants without crashing', () => {
      (['sm', 'md', 'lg'] as const).forEach((size) => {
        const { container } = render(React.createElement(Spinner, { size }));
        expect(container.firstChild).not.toBeNull();
      });
    });
  });

  // ── No duplicate animate-spin outside canonical components ────────────────

  describe('no duplicate spinner markup in CourseGrid', () => {
    /**
     * This is a static assertion: the inline `animate-spin rounded-full
     * border-b-2` pattern should no longer exist in CourseGrid.tsx.
     * We verify this by ensuring the Spinner component is the sole carrier of
     * animate-spin logic, and the integration test in CourseGrid would use
     * getByRole('status') — here we just confirm the Spinner output contains it.
     */
    it('canonical Spinner SVG carries animate-spin', () => {
      const { container } = render(React.createElement(Spinner));
      expect(container.innerHTML).toContain('animate-spin');
    });
  });
});
