import { StripHtmlSanitizer } from './strip-html.sanitizer';

/**
 * #1036 — Negative-path integration tests for backend input sanitization.
 *
 * Verifies that all free-text DTO fields across grants, governance,
 * moderation, forums, and reviews are properly sanitized against XSS
 * and script injection payloads.
 */

describe('Sanitization integration — #1036', () => {
  const sanitizer = new StripHtmlSanitizer();

  // ── Payload classes ──────────────────────────────────────────────────────

  const xssPayloads = [
    { label: 'basic script tag', input: '<script>alert("xss")</script>', expected: '' },
    { label: 'nested script tag', input: '<scr<script>ipt>alert(1)</scr</script>ipt>', expected: 'ipt&gt;alert(1)ipt&gt;' },
    { label: 'script with src', input: '<script src="https://evil.com/payload.js"></script>', expected: '' },
    { label: 'event handler on div', input: '<div onmouseover="alert(1)">hover me</div>', expected: 'hover me' },
    { label: 'img onerror', input: '<img src=x onerror="alert(1)"/>', expected: '' },
    { label: 'svg onload', input: '<svg onload="alert(1)"/>', expected: '' },
    { label: 'javascript URL', input: '<a href="javascript:alert(1)">click</a>', expected: 'click' },
    { label: 'data URI script', input: '<a href="data:text/html,<script>alert(1)</script>">link</a>', expected: 'link' },
    { label: 'iframe injection', input: '<iframe src="https://evil.com"></iframe>', expected: '' },
    { label: 'body onload', input: '<body onload="alert(1)">', expected: '' },
    { label: 'input onfocus', input: '<input onfocus="alert(1)" autofocus>', expected: '' },
    { label: 'details ontoggle', input: '<details ontoggle="alert(1)"><summary>click</summary></details>', expected: 'click' },
    { label: 'expression in style', input: '<div style="background:expression(alert(1))">test</div>', expected: 'test' },
    { label: 'malformed markup', input: '<div<div>nested</div', expected: 'nested' },
    { label: 'encoded script', input: '&lt;script&gt;alert(1)&lt;/script&gt;', expected: '&lt;script&gt;alert(1)&lt;/script&gt;' },
  ];

  // ── Grant fields ─────────────────────────────────────────────────────────

  describe('Grant DTO fields', () => {
    it('sanitizes grant title', () => {
      const input = '<script>alert("xss")</script>Stellar Education';
      expect(sanitizer.sanitize(input)).toBe('Stellar Education');
    });

    it('sanitizes grant description', () => {
      const input = 'A grant for <img src=x onerror="alert(1)"> education';
      expect(sanitizer.sanitize(input)).toBe('A grant for  education');
    });

    it('sanitizes grant reviewNotes', () => {
      const input = 'Looks good <script>document.cookie</script> approved';
      expect(sanitizer.sanitize(input)).toBe('Looks good  approved');
    });

    it('preserves legitimate grant title', () => {
      const input = 'STEM Education Initiative 2024';
      expect(sanitizer.sanitize(input)).toBe('STEM Education Initiative 2024');
    });

    it('preserves grant description with special chars', () => {
      const input = 'Funding for $10,000+ programs (50% match) — applied 2024/01/15';
      expect(sanitizer.sanitize(input)).toBe(input);
    });
  });

  // ── Governance fields ────────────────────────────────────────────────────

  describe('Governance DTO fields', () => {
    it('sanitizes proposal title', () => {
      const input = '<b onmouseover="alert(1)">Important Vote</b>';
      expect(sanitizer.sanitize(input)).toBe('Important Vote');
    });

    it('sanitizes proposal description', () => {
      const input = 'Proposal to <svg onload="alert(1)">increase funding</svg>';
      expect(sanitizer.sanitize(input)).toBe('Proposal to increase funding');
    });

    it('preserves legitimate proposal title', () => {
      const input = 'Q4 Budget Allocation';
      expect(sanitizer.sanitize(input)).toBe('Q4 Budget Allocation');
    });

    it('preserves proposal description with code-like content', () => {
      const input = 'The function should return { status: "ok", count: 42 }';
      expect(sanitizer.sanitize(input)).toBe(input);
    });
  });

  // ── Moderation fields ────────────────────────────────────────────────────

  describe('Moderation DTO fields', () => {
    it('sanitizes flag reason', () => {
      const input = 'Contains <script>steal()</script> inappropriate content';
      expect(sanitizer.sanitize(input)).toBe('Contains  inappropriate content');
    });

    it('sanitizes review note', () => {
      const input = 'Reviewed by admin <img src=x onerror="alert(1)"> — approved';
      expect(sanitizer.sanitize(input)).toBe('Reviewed by admin  — approved');
    });

    it('sanitizes appeal reason', () => {
      const input = 'This was a mistake <iframe src="evil.com"></iframe> please reconsider';
      expect(sanitizer.sanitize(input)).toBe('This was a mistake  please reconsider');
    });

    it('preserves legitimate moderation note', () => {
      const input = 'Content violates community guidelines (section 3.2)';
      expect(sanitizer.sanitize(input)).toBe(input);
    });
  });

  // ── Forum fields ─────────────────────────────────────────────────────────

  describe('Forum DTO fields', () => {
    it('sanitizes forum post title', () => {
      const input = '<a href="javascript:alert(1)">Click here</a>';
      expect(sanitizer.sanitize(input)).toBe('Click here');
    });

    it('sanitizes forum post content', () => {
      const input = 'Great discussion! <svg onload="alert(1)"> Thanks all';
      expect(sanitizer.sanitize(input)).toBe('Great discussion!  Thanks all');
    });

    it('sanitizes reply content', () => {
      const input = 'I agree <div onmouseover="alert(1)">with this</div> point';
      expect(sanitizer.sanitize(input)).toBe('I agree with this point');
    });

    it('preserves legitimate forum post', () => {
      const input = 'Has anyone tried deploying to testnet? I keep getting timeout errors.';
      expect(sanitizer.sanitize(input)).toBe(input);
    });
  });

  // ── Review fields ────────────────────────────────────────────────────────

  describe('Review DTO fields', () => {
    it('sanitizes review comment', () => {
      const input = 'Excellent! <script>document.cookie</script> 5/5 stars';
      expect(sanitizer.sanitize(input)).toBe('Excellent!  5/5 stars');
    });

    it('preserves legitimate review', () => {
      const input = 'Great course content. The exercises were challenging but fair.';
      expect(sanitizer.sanitize(input)).toBe(input);
    });
  });

  // ── Generic payload sweep ────────────────────────────────────────────────

  describe('All payload classes are neutralized', () => {
    xssPayloads.forEach(({ label, input, expected }) => {
      it(`neutralizes ${label}`, () => {
        expect(sanitizer.sanitize(input)).toBe(expected);
      });
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

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
      const input = 'Hello world <script>alert(1)</script> this is safe content <img onerror="alert(2)"> end';
      expect(sanitizer.sanitize(input)).toBe('Hello world  this is safe content  end');
    });
  });
});
