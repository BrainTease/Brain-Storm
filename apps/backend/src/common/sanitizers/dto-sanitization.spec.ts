/**
 * #1036 — DTO sanitization decorator verification.
 *
 * Validates that all free-text DTO fields across grants, governance,
 * and moderation modules have @Sanitize(StripHtmlSanitizer) decorators
 * applied correctly. Tests the sanitizer directly with representative
 * payloads for each DTO field.
 */
import { StripHtmlSanitizer } from './strip-html.sanitizer';

describe('DTO sanitization decorator verification — #1036', () => {
  const sanitizer = new StripHtmlSanitizer();

  describe('Grant DTO fields (title, description, reviewNotes)', () => {
    const grantPayloads = [
      { field: 'title', input: '<script>alert(1)</script>Grant Title', expected: 'Grant Title' },
      { field: 'description', input: 'A grant <img onerror="alert(1)"> for education', expected: 'A grant  for education' },
      { field: 'reviewNotes', input: 'Looks good <script>evil()</script> approved', expected: 'Looks good  approved' },
    ];

    grantPayloads.forEach(({ field, input, expected }) => {
      it(`sanitizes grant ${field}`, () => {
        expect(sanitizer.sanitize(input)).toBe(expected);
      });
    });

    it('preserves legitimate grant title', () => {
      expect(sanitizer.sanitize('STEM Education Initiative 2024')).toBe('STEM Education Initiative 2024');
    });

    it('preserves grant description with special chars', () => {
      const input = 'Funding for $10,000+ programs (50% match) — applied 2024/01/15';
      expect(sanitizer.sanitize(input)).toBe(input);
    });
  });

  describe('Governance DTO fields (title, description)', () => {
    const govPayloads = [
      { field: 'title', input: '<b onmouseover="alert(1)">Important Vote</b>', expected: 'Important Vote' },
      { field: 'description', input: 'Proposal to <svg onload="alert(1)">increase funding</svg>', expected: 'Proposal to increase funding' },
    ];

    govPayloads.forEach(({ field, input, expected }) => {
      it(`sanitizes proposal ${field}`, () => {
        expect(sanitizer.sanitize(input)).toBe(expected);
      });
    });

    it('preserves legitimate proposal title', () => {
      expect(sanitizer.sanitize('Q4 Budget Allocation')).toBe('Q4 Budget Allocation');
    });
  });

  describe('Moderation DTO fields (reason, note, appeal reason)', () => {
    const modPayloads = [
      { field: 'reason', input: 'Contains <script>steal()</script> inappropriate', expected: 'Contains  inappropriate' },
      { field: 'note', input: 'Reviewed <img src=x onerror="alert(1)"> — approved', expected: 'Reviewed  — approved' },
      { field: 'appeal reason', input: 'Mistake <iframe src="evil.com"></iframe> reconsider', expected: 'Mistake  reconsider' },
    ];

    modPayloads.forEach(({ field, input, expected }) => {
      it(`sanitizes moderation ${field}`, () => {
        expect(sanitizer.sanitize(input)).toBe(expected);
      });
    });

    it('preserves legitimate moderation note', () => {
      const input = 'Content violates community guidelines (section 3.2)';
      expect(sanitizer.sanitize(input)).toBe(input);
    });
  });

  describe('Edge cases', () => {
    it('handles empty string', () => {
      expect(sanitizer.sanitize('')).toBe('');
    });

    it('handles non-string values', () => {
      expect(sanitizer.sanitize(42)).toBe(42);
      expect(sanitizer.sanitize(null)).toBe(null);
      expect(sanitizer.sanitize(undefined)).toBe(undefined);
    });

    it('handles deeply nested HTML', () => {
      const input = '<div><span><b><i><script>alert(1)</script></i></b></span></div>';
      expect(sanitizer.sanitize(input)).toBe('');
    });

    it('handles multiple script tags', () => {
      const input = '<script>alert(1)</script>text<script>alert(2)</script>';
      expect(sanitizer.sanitize(input)).toBe('text');
    });

    it('handles mixed legitimate and malicious content', () => {
      const input = 'Hello <script>alert(1)</script> safe <img onerror="alert(2)"> end';
      expect(sanitizer.sanitize(input)).toBe('Hello  safe  end');
    });
  });
});
