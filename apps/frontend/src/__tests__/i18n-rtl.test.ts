import { describe, it, expect } from 'vitest';
import { RTL_LOCALES, isRTLLocale, routing } from '@/i18n/routing';

describe('i18n RTL Support', () => {
  describe('RTL_LOCALES constant', () => {
    it('should include Arabic (ar)', () => {
      expect(RTL_LOCALES).toContain('ar');
    });

    it('should include Hebrew (he) and Farsi (fa) for future support', () => {
      expect(RTL_LOCALES).toContain('he');
      expect(RTL_LOCALES).toContain('fa');
    });

    it('should not include LTR locales', () => {
      expect(RTL_LOCALES).not.toContain('en');
      expect(RTL_LOCALES).not.toContain('es');
      expect(RTL_LOCALES).not.toContain('fr');
    });
  });

  describe('isRTLLocale function', () => {
    it('should return true for RTL locales', () => {
      expect(isRTLLocale('ar')).toBe(true);
      expect(isRTLLocale('he')).toBe(true);
      expect(isRTLLocale('fa')).toBe(true);
    });

    it('should return false for LTR locales', () => {
      expect(isRTLLocale('en')).toBe(false);
      expect(isRTLLocale('es')).toBe(false);
      expect(isRTLLocale('fr')).toBe(false);
    });

    it('should return false for unknown locales', () => {
      expect(isRTLLocale('unknown')).toBe(false);
      expect(isRTLLocale('')).toBe(false);
    });
  });

  describe('routing configuration', () => {
    it('should include Arabic locale', () => {
      expect(routing.locales).toContain('ar');
    });

    it('should have English as default locale', () => {
      expect(routing.defaultLocale).toBe('en');
    });

    it('should have consistent locales array', () => {
      expect(routing.locales).toEqual(['en', 'es', 'fr', 'ar']);
    });
  });

  describe('RTL locale order', () => {
    it('should prioritize Arabic in RTL locales list', () => {
      // Arabic is the primary RTL language currently supported
      expect(RTL_LOCALES[0]).toBe('ar');
    });
  });

  describe('Locale validation', () => {
    it('should validate locales correctly', () => {
      const validLocale = routing.locales[0];
      expect(routing.locales.includes(validLocale as any)).toBe(true);
    });

    it('should reject invalid locales', () => {
      const invalidLocale = 'xx';
      expect(routing.locales.includes(invalidLocale as any)).toBe(false);
    });
  });
});
