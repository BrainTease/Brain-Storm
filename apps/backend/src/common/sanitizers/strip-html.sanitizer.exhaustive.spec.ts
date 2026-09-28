/**
 * Exhaustive unit tests for StripHtmlSanitizer — closes #1192.
 *
 * Targets:
 *  - 95%+ branch/statement/function coverage for common/sanitizers
 *  - Known XSS/injection payload patterns (OWASP Top-10, DOMPurify bypasses)
 *  - Unicode and encoding edge cases
 *  - SQL injection patterns threaded through HTML vectors
 *  - Prototype pollution via attribute injection
 *  - Path traversal attempts embedded in tag attributes
 *  - Null-byte injection
 *  - DOM clobbering patterns
 *  - Template injection fragments
 *  - CSS injection / expression() payloads
 */

import { StripHtmlSanitizer } from './strip-html.sanitizer';

// ---------------------------------------------------------------------------
// Helper: assert that a sanitized value contains NONE of the dangerous tokens
// ---------------------------------------------------------------------------
function assertNoScript(output: string): void {
  expect(output).not.toMatch(/<script/i);
  expect(output).not.toMatch(/javascript:/i);
  expect(output).not.toMatch(/onerror\s*=/i);
  expect(output).not.toMatch(/onload\s*=/i);
  expect(output).not.toMatch(/eval\s*\(/i);
}

describe('StripHtmlSanitizer — #1192 exhaustive unit tests', () => {
  let sanitizer: StripHtmlSanitizer;

  beforeEach(() => {
    sanitizer = new StripHtmlSanitizer();
  });

  // ── 1. Basic sanitizer contract ──────────────────────────────────────────

  describe('1. Basic sanitizer contract', () => {
    it('returns non-string values unchanged — number', () => {
      expect(sanitizer.sanitize(42)).toBe(42);
    });

    it('returns non-string values unchanged — zero', () => {
      expect(sanitizer.sanitize(0)).toBe(0);
    });

    it('returns non-string values unchanged — negative number', () => {
      expect(sanitizer.sanitize(-99)).toBe(-99);
    });

    it('returns non-string values unchanged — boolean true', () => {
      expect(sanitizer.sanitize(true)).toBe(true);
    });

    it('returns non-string values unchanged — boolean false', () => {
      expect(sanitizer.sanitize(false)).toBe(false);
    });

    it('returns non-string values unchanged — null', () => {
      expect(sanitizer.sanitize(null)).toBe(null);
    });

    it('returns non-string values unchanged — undefined', () => {
      expect(sanitizer.sanitize(undefined)).toBe(undefined);
    });

    it('returns non-string values unchanged — array', () => {
      const arr = [1, 2, 3];
      expect(sanitizer.sanitize(arr)).toBe(arr);
    });

    it('returns non-string values unchanged — object', () => {
      const obj = { key: 'value' };
      expect(sanitizer.sanitize(obj)).toBe(obj);
    });

    it('returns empty string unchanged', () => {
      expect(sanitizer.sanitize('')).toBe('');
    });

    it('returns plain text unchanged', () => {
      expect(sanitizer.sanitize('Hello, World!')).toBe('Hello, World!');
    });

    it('preserves digits in plain text', () => {
      expect(sanitizer.sanitize('Order #12345')).toBe('Order #12345');
    });

    it('preserves special punctuation in plain text', () => {
      const text = 'Price: $9.99 (50% off) — expires 2025/12/31';
      expect(sanitizer.sanitize(text)).toBe(text);
    });

    it('preserves email addresses in plain text', () => {
      expect(sanitizer.sanitize('Contact: user@example.com')).toBe('Contact: user@example.com');
    });

    it('preserves URLs in plain text when not in a tag', () => {
      expect(sanitizer.sanitize('Visit https://example.com')).toBe('Visit https://example.com');
    });
  });

  // ── 2. XSS — Script-tag patterns ────────────────────────────────────────

  describe('2. XSS — Script-tag patterns (OWASP A03)', () => {
    it('strips basic script tag', () => {
      const output = sanitizer.sanitize('<script>alert("xss")</script>');
      assertNoScript(output);
      expect(output).toBe('');
    });

    it('strips script tag with src attribute', () => {
      const output = sanitizer.sanitize('<script src="https://evil.com/xss.js"></script>');
      assertNoScript(output);
    });

    it('strips script tag with type attribute', () => {
      const output = sanitizer.sanitize('<script type="text/javascript">alert(1)</script>');
      assertNoScript(output);
    });

    it('preserves text surrounding a stripped script tag', () => {
      expect(sanitizer.sanitize('Before<script>alert(1)</script>After')).toBe('BeforeAfter');
    });

    it('strips multiple consecutive script tags', () => {
      const input = '<script>a()</script>text<script>b()</script>';
      expect(sanitizer.sanitize(input)).toBe('text');
    });

    it('strips script tags with mixed case', () => {
      const output = sanitizer.sanitize('<ScRiPt>alert(1)</ScRiPt>');
      assertNoScript(output);
    });

    it('strips script with whitespace in tag name', () => {
      // Sanitizers handle `< script>` differently; make sure nothing leaks
      const output = sanitizer.sanitize('< script >alert(1)</ script>');
      assertNoScript(output);
    });

    it('strips deeply nested script inside other tags', () => {
      const input = '<div><span><b><i><script>alert(1)</script></i></b></span></div>';
      expect(sanitizer.sanitize(input)).toBe('');
    });
  });

  // ── 3. XSS — Event handler injection ────────────────────────────────────

  describe('3. XSS — Event handler injection', () => {
    const eventHandlerPayloads: Array<{ label: string; input: string }> = [
      { label: 'img onerror',          input: '<img src=x onerror="alert(1)"/>' },
      { label: 'img onload',           input: '<img onload="alert(1)" src="x.png">' },
      { label: 'body onload',          input: '<body onload="alert(1)">' },
      { label: 'div onmouseover',      input: '<div onmouseover="alert(1)">hover</div>' },
      { label: 'a onclick',            input: '<a onclick="alert(1)">click</a>' },
      { label: 'input onfocus',        input: '<input onfocus="alert(1)" autofocus>' },
      { label: 'details ontoggle',     input: '<details ontoggle="alert(1)"><summary>x</summary></details>' },
      { label: 'svg onload',           input: '<svg onload="alert(1)"/>' },
      { label: 'svg onbegin',          input: '<svg><animate onbegin="alert(1)" attributeName="x" dur="1s"/></svg>' },
      { label: 'form oninput',         input: '<form oninput="alert(1)"><input></form>' },
      { label: 'video onerror',        input: '<video onerror="alert(1)"><source src=x></video>' },
      { label: 'marquee onstart',      input: '<marquee onstart="alert(1)">text</marquee>' },
      { label: 'select onchange',      input: '<select onchange="alert(1)"><option>a</option></select>' },
      { label: 'textarea onfocus',     input: '<textarea onfocus="alert(1)">x</textarea>' },
    ];

    eventHandlerPayloads.forEach(({ label, input }) => {
      it(`neutralizes ${label} event handler`, () => {
        const output = sanitizer.sanitize(input);
        assertNoScript(output);
        expect(output).not.toMatch(/on\w+\s*=/i);
      });
    });
  });

  // ── 4. XSS — JavaScript URL schemes ─────────────────────────────────────

  describe('4. XSS — JavaScript URL schemes', () => {
    it('strips href with javascript: scheme', () => {
      const output = sanitizer.sanitize('<a href="javascript:alert(1)">click</a>');
      expect(output).toBe('click');
    });

    it('strips href with JAVASCRIPT: (uppercase)', () => {
      const output = sanitizer.sanitize('<a href="JAVASCRIPT:alert(1)">click</a>');
      expect(output).toBe('click');
    });

    it('strips href with java script: (space variant)', () => {
      const output = sanitizer.sanitize('<a href="java script:alert(1)">click</a>');
      expect(output).toBe('click');
    });

    it('strips href with data: URI containing script', () => {
      const output = sanitizer.sanitize('<a href="data:text/html,<script>alert(1)</script>">link</a>');
      expect(output).toBe('link');
    });

    it('strips src with data: URI', () => {
      const output = sanitizer.sanitize('<img src="data:image/svg+xml,<svg onload=alert(1)>"/>');
      expect(output).toBe('');
    });

    it('strips vbscript: URL scheme', () => {
      const output = sanitizer.sanitize('<a href="vbscript:msgbox(1)">click</a>');
      expect(output).toBe('click');
    });
  });

  // ── 5. XSS — Tag injection (non-script) ─────────────────────────────────

  describe('5. XSS — Non-script dangerous tags', () => {
    it('strips iframe tag', () => {
      const output = sanitizer.sanitize('<iframe src="https://evil.com"></iframe>');
      expect(output).toBe('');
    });

    it('strips iframe with srcdoc attribute', () => {
      const output = sanitizer.sanitize('<iframe srcdoc="<script>alert(1)</script>"></iframe>');
      assertNoScript(output);
    });

    it('strips object tag', () => {
      const output = sanitizer.sanitize('<object data="evil.swf"></object>');
      expect(output).toBe('');
    });

    it('strips embed tag', () => {
      const output = sanitizer.sanitize('<embed src="evil.swf">');
      expect(output).toBe('');
    });

    it('strips form with action', () => {
      const output = sanitizer.sanitize('<form action="https://evil.com/steal">data</form>');
      expect(output).toBe('data');
    });

    it('strips meta refresh', () => {
      const output = sanitizer.sanitize('<meta http-equiv="refresh" content="0; url=https://evil.com">');
      expect(output).toBe('');
    });

    it('strips base tag with href', () => {
      const output = sanitizer.sanitize('<base href="https://evil.com">legit text');
      expect(output).toBe('legit text');
    });

    it('strips link rel=import', () => {
      const output = sanitizer.sanitize('<link rel="import" href="evil.html">');
      expect(output).toBe('');
    });

    it('strips svg with embedded payload', () => {
      const output = sanitizer.sanitize('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      assertNoScript(output);
    });

    it('strips math tag with href', () => {
      const output = sanitizer.sanitize('<math href="javascript:alert(1)">x</math>');
      // Text content may or may not be preserved depending on parser, but no JS
      expect(output).not.toMatch(/javascript:/i);
    });
  });

  // ── 6. CSS injection ─────────────────────────────────────────────────────

  describe('6. CSS injection', () => {
    it('strips inline style with expression()', () => {
      const output = sanitizer.sanitize('<div style="width:expression(alert(1))">test</div>');
      expect(output).toBe('test');
    });

    it('strips inline style with url() pointing to script', () => {
      const output = sanitizer.sanitize('<div style="background:url(javascript:alert(1))">test</div>');
      expect(output).toBe('test');
    });

    it('strips inline style entirely', () => {
      const output = sanitizer.sanitize('<span style="color:red">text</span>');
      expect(output).toBe('text');
    });

    it('strips style block', () => {
      const output = sanitizer.sanitize('<style>body{background:url("javascript:alert(1)")}</style>after');
      expect(output).toBe('after');
    });
  });

  // ── 7. Encoding and unicode edge cases ───────────────────────────────────

  describe('7. Encoding and unicode edge cases', () => {
    it('handles HTML entities that look like script tags (pre-encoded)', () => {
      // &lt;script&gt; is already encoded — sanitize-html preserves entities
      const input = '&lt;script&gt;alert(1)&lt;/script&gt;';
      const output = sanitizer.sanitize(input);
      // The output should still contain the entity-encoded form (safe)
      expect(output).toContain('&lt;script&gt;');
    });

    it('preserves multi-byte unicode characters in plain text', () => {
      const input = 'Bienvenue 🎉 — naïve résumé 中文 日本語 한국어';
      expect(sanitizer.sanitize(input)).toBe(input);
    });

    it('handles zero-width spaces in strings', () => {
      // \u200B zero-width space — must not cause crashes
      const input = 'Hello\u200BWorld';
      const output = sanitizer.sanitize(input);
      expect(typeof output).toBe('string');
    });

    it('handles right-to-left override character', () => {
      const input = 'Hello \u202EWorld'; // RLO character
      const output = sanitizer.sanitize(input);
      expect(typeof output).toBe('string');
    });

    it('handles null bytes in string', () => {
      // Null bytes should not crash the sanitizer
      const input = 'Hello\x00World<script>alert(1)</script>';
      const output = sanitizer.sanitize(input);
      assertNoScript(output);
    });

    it('handles strings with only whitespace', () => {
      expect(sanitizer.sanitize('   ')).toBe('   ');
    });

    it('handles newlines and tabs in plain text', () => {
      const input = 'Line 1\nLine 2\tTabbed';
      expect(sanitizer.sanitize(input)).toBe(input);
    });

    it('handles very long strings (performance boundary)', () => {
      const longText = 'A'.repeat(100_000);
      const output = sanitizer.sanitize(longText);
      expect(output).toBe(longText);
    });

    it('handles very long XSS payload', () => {
      const payload = '<script>' + 'alert(1);'.repeat(1000) + '</script>safe';
      const output = sanitizer.sanitize(payload);
      assertNoScript(output);
      expect(output).toContain('safe');
    });

    it('handles unicode lookalike tags (not real HTML)', () => {
      // ＜script＞ uses fullwidth less-than / greater-than — these should be treated as text
      const input = '＜script＞alert(1)＜/script＞';
      const output = sanitizer.sanitize(input);
      // Should not execute as HTML
      expect(typeof output).toBe('string');
    });

    it('handles HTML comment injection', () => {
      const input = '<!-- <script>alert(1)</script> -->safe';
      const output = sanitizer.sanitize(input);
      // Comments are stripped; remaining text contains 'safe'
      expect(output).not.toMatch(/<script/i);
    });

    it('handles conditional comments (IE-specific)', () => {
      const input = '<!--[if IE]><script>alert(1)</script><![endif]-->text';
      const output = sanitizer.sanitize(input);
      assertNoScript(output);
    });
  });

  // ── 8. SQL injection patterns (embedded in HTML) ─────────────────────────

  describe('8. SQL injection patterns embedded in HTML', () => {
    it('preserves SQL-style plain text (no HTML)', () => {
      // Plain SQL strings should pass through unchanged
      const sql = "SELECT * FROM users WHERE id = '1' OR '1'='1'";
      expect(sanitizer.sanitize(sql)).toBe(sql);
    });

    it('strips script but preserves SQL comment syntax', () => {
      const input = "valid<script>alert(1)</script>-- drop table";
      const output = sanitizer.sanitize(input);
      expect(output).toBe('valid-- drop table');
    });

    it('handles SQL in attribute injection attempts', () => {
      // This tests the boundary between attribute injection and SQL
      const input = "<img src=x onload=\"SELECT * FROM users\"/>";
      const output = sanitizer.sanitize(input);
      expect(output).toBe('');
    });
  });

  // ── 9. Prototype pollution via attribute injection ───────────────────────

  describe('9. Prototype pollution via attribute injection', () => {
    it('strips __proto__ in tag attributes', () => {
      const output = sanitizer.sanitize('<div __proto__="evil">text</div>');
      expect(output).toBe('text');
      expect(output).not.toContain('__proto__');
    });

    it('strips constructor attribute injection', () => {
      const output = sanitizer.sanitize('<form action="x" constructor="alert">data</form>');
      expect(output).toBe('data');
    });

    it('strips data- attributes used for script injection', () => {
      const output = sanitizer.sanitize('<div data-onload="alert(1)">text</div>');
      expect(output).toBe('text');
    });
  });

  // ── 10. Path traversal fragments in attribute values ────────────────────

  describe('10. Path traversal attempts', () => {
    it('strips img src with path traversal', () => {
      // The tag is stripped; traversal path is inside the removed attribute
      const output = sanitizer.sanitize('<img src="../../etc/passwd">');
      expect(output).toBe('');
    });

    it('strips iframe src with path traversal', () => {
      const output = sanitizer.sanitize('<iframe src="../../../config.yml"></iframe>');
      expect(output).toBe('');
    });

    it('preserves plain text containing path-like strings', () => {
      const text = 'The file is at /var/app/../config/secret.env';
      expect(sanitizer.sanitize(text)).toBe(text);
    });
  });

  // ── 11. DOM clobbering patterns ──────────────────────────────────────────

  describe('11. DOM clobbering', () => {
    it('strips anchor with id=location for DOM clobbering', () => {
      const output = sanitizer.sanitize('<a id="location" href="https://evil.com">click</a>');
      expect(output).toBe('click');
    });

    it('strips form with name= for DOM clobbering', () => {
      const output = sanitizer.sanitize('<form name="querySelectorAll">data</form>');
      expect(output).toBe('data');
    });
  });

  // ── 12. Template injection fragments ─────────────────────────────────────

  describe('12. Template injection fragments', () => {
    it('preserves Angular-style {{ expression }} in plain text (not HTML)', () => {
      // These are not HTML — sanitize-html should leave them alone
      const text = 'Hello {{ user.name }}!';
      expect(sanitizer.sanitize(text)).toBe(text);
    });

    it('strips script wrapping a template expression', () => {
      const input = '<script>{{ constructor.constructor("alert(1)")() }}</script>';
      const output = sanitizer.sanitize(input);
      assertNoScript(output);
    });

    it('preserves Jinja2-style {% %} in plain text', () => {
      const text = '{% if user.admin %}Hello{% endif %}';
      expect(sanitizer.sanitize(text)).toBe(text);
    });
  });

  // ── 13. Malformed / tricky HTML markup ──────────────────────────────────

  describe('13. Malformed and tricky HTML markup', () => {
    it('handles unclosed tags', () => {
      const output = sanitizer.sanitize('<b>bold text without closing tag');
      expect(output).toBe('bold text without closing tag');
    });

    it('handles tags with no space before attributes', () => {
      const output = sanitizer.sanitize('<div\nonmouseover="alert(1)">text</div>');
      expect(output).toBe('text');
    });

    it('handles stacked angle brackets', () => {
      const output = sanitizer.sanitize('<<script>alert(1)</script>');
      assertNoScript(output);
    });

    it('handles broken comment injection', () => {
      const output = sanitizer.sanitize('<!-- --!><script>alert(1)</script>');
      assertNoScript(output);
    });

    it('handles self-closing script (non-standard)', () => {
      const output = sanitizer.sanitize('<script/>alert(1)');
      assertNoScript(output);
    });

    it('returns empty string for tag-only input', () => {
      expect(sanitizer.sanitize('<b></b>')).toBe('');
    });

    it('strips tags but preserves whitespace between words', () => {
      const output = sanitizer.sanitize('Hello <b>bold</b> World');
      expect(output).toBe('Hello bold World');
    });
  });

  // ── 14. Repeat of integration payloads to pin regression ────────────────

  describe('14. Regression pins for integration payload classes', () => {
    const regressionPayloads: Array<{ label: string; input: string; expected: string }> = [
      { label: 'grant title with script',     input: '<script>alert(1)</script>STEM Grant', expected: 'STEM Grant' },
      { label: 'grant desc with img onerror', input: 'Grant for <img src=x onerror="steal()"> education', expected: 'Grant for  education' },
      { label: 'governance proposal title',   input: '<b onmouseover="x()">Vote Now</b>', expected: 'Vote Now' },
      { label: 'moderation flag reason',      input: 'Bad <script>steal()</script> content', expected: 'Bad  content' },
      { label: 'forum post with svg',         input: 'Post <svg onload="x()"> body', expected: 'Post  body' },
      { label: 'review with iframe',          input: 'Great <iframe src="evil.com"></iframe> course', expected: 'Great  course' },
    ];

    regressionPayloads.forEach(({ label, input, expected }) => {
      it(`regression: ${label}`, () => {
        const output = sanitizer.sanitize(input);
        expect(output).toBe(expected);
        assertNoScript(output);
      });
    });
  });
});
