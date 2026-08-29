/**
 * Unit tests for i18n string extraction — issue #971
 *
 * Verifies that the message catalog covers the keys consumed by the pilot
 * pages and that no expected key is absent.
 *
 * ⚠️ DO NOT RUN — implementation only, per task instructions.
 */

import { describe, it, expect } from 'vitest';
import en from '../../../messages/en.json';

// ── Type helper ───────────────────────────────────────────────────────────────

type MessageCatalog = Record<string, Record<string, unknown>>;

function hasKey(catalog: MessageCatalog, namespace: string, key: string): boolean {
  return key in (catalog[namespace] ?? {});
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('i18n message catalog (en.json)', () => {
  const catalog = en as unknown as MessageCatalog;

  // ── credentials namespace (pilot page #1) ──────────────────────────────────
  describe('credentials namespace', () => {
    const ns = 'credentials';

    it('has title key', () => expect(hasKey(catalog, ns, 'title')).toBe(true));
    it('has subtitle key', () => expect(hasKey(catalog, ns, 'subtitle')).toBe(true));
    it('has emptyNft key', () => expect(hasKey(catalog, ns, 'emptyNft')).toBe(true));
    it('has emptyNftTitle key', () => expect(hasKey(catalog, ns, 'emptyNftTitle')).toBe(true));
    it('has defaultDescription key', () =>
      expect(hasKey(catalog, ns, 'defaultDescription')).toBe(true));
    it('has defaultStudentName key', () =>
      expect(hasKey(catalog, ns, 'defaultStudentName')).toBe(true));
  });

  // ── dashboard namespace (pilot page #2) ───────────────────────────────────
  describe('dashboard namespace', () => {
    const ns = 'dashboard';

    it('has enrolledCourses key', () => expect(hasKey(catalog, ns, 'enrolledCourses')).toBe(true));
    it('has recentCredentials key', () =>
      expect(hasKey(catalog, ns, 'recentCredentials')).toBe(true));
    it('has noCoursesYet key', () => expect(hasKey(catalog, ns, 'noCoursesYet')).toBe(true));
    it('has noCredentialsYet key', () =>
      expect(hasKey(catalog, ns, 'noCredentialsYet')).toBe(true));
    it('has loadError key', () => expect(hasKey(catalog, ns, 'loadError')).toBe(true));
  });

  // ── profile namespace (pilot page #3) ─────────────────────────────────────
  describe('profile namespace', () => {
    const ns = 'profile';

    it('has editProfile key', () => expect(hasKey(catalog, ns, 'editProfile')).toBe(true));
    it('has username key', () => expect(hasKey(catalog, ns, 'username')).toBe(true));
    it('has bio key', () => expect(hasKey(catalog, ns, 'bio')).toBe(true));
    it('has saving key', () => expect(hasKey(catalog, ns, 'saving')).toBe(true));
    it('has saved key', () => expect(hasKey(catalog, ns, 'saved')).toBe(true));
    it('has saveChanges key', () => expect(hasKey(catalog, ns, 'saveChanges')).toBe(true));
  });

  // ── courses namespace (pilot page #4) ─────────────────────────────────────
  describe('courses namespace', () => {
    const ns = 'courses';

    it('has title key', () => expect(hasKey(catalog, ns, 'title')).toBe(true));
    it('has viewCourse key', () => expect(hasKey(catalog, ns, 'viewCourse')).toBe(true));
  });

  // ── admin namespace (pilot page #5) ───────────────────────────────────────
  describe('admin namespace', () => {
    const ns = 'admin';

    it('has title key', () => expect(hasKey(catalog, ns, 'title')).toBe(true));
    it('has export key', () => expect(hasKey(catalog, ns, 'export')).toBe(true));
    it('has metrics sub-object', () => expect(typeof catalog[ns]?.metrics).toBe('object'));
  });

  // ── nav namespace ──────────────────────────────────────────────────────────
  describe('nav namespace', () => {
    const ns = 'nav';

    it('has brand key', () => expect(hasKey(catalog, ns, 'brand')).toBe(true));
    it('has courses key', () => expect(hasKey(catalog, ns, 'courses')).toBe(true));
    it('has login key', () => expect(hasKey(catalog, ns, 'login')).toBe(true));
    it('has logout key', () => expect(hasKey(catalog, ns, 'logout')).toBe(true));
  });

  // ── catalog integrity ─────────────────────────────────────────────────────
  describe('catalog integrity', () => {
    it('all top-level namespaces are objects', () => {
      for (const [key, value] of Object.entries(catalog)) {
        expect(typeof value, `namespace "${key}" should be an object`).toBe('object');
      }
    });

    it('no namespace has an empty string value for any key', () => {
      for (const [ns, messages] of Object.entries(catalog)) {
        for (const [key, value] of Object.entries(messages as Record<string, unknown>)) {
          if (typeof value === 'string') {
            expect(value.length, `${ns}.${key} must not be an empty string`).toBeGreaterThan(0);
          }
        }
      }
    });
  });
});
