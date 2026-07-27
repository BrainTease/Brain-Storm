import { Transform } from 'class-transformer';
import sanitizeHtml from 'sanitize-html';

/**
 * Sanitize HTML content, removing all tags
 */
export function SanitizeHtml() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    return sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
    });
  });
}

/**
 * Trim whitespace from string
 */
export function TrimString() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  });
}

/**
 * Remove null bytes and control characters
 */
export function RemoveControlChars() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    // Remove null bytes and other control characters
    return value.replace(/[\x00-\x1F\x7F]/g, '');
  });
}

/**
 * Sanitize URL to prevent javascript: and data: protocols
 */
export function SanitizeUrl() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    try {
      const url = new URL(value);
      if (!['http:', 'https:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
      return value;
    } catch {
      throw new Error('Invalid URL');
    }
  });
}

/**
 * Sanitize email address
 */
export function SanitizeEmail() {
  return Transform(({ value }) => {
    if (typeof value !== 'string') {
      return value;
    }
    // Basic email sanitization - lowercase and trim
    return value.toLowerCase().trim();
  });
}
