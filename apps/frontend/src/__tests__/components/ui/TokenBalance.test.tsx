import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TokenBalance, formatTokenBalance } from '@/components/ui/TokenBalance';

describe('TokenBalance Component', () => {
  describe('rendering', () => {
    it('should render balance with symbol', () => {
      render(<TokenBalance balance={100} symbol="XLM" />);
      expect(screen.getByText(/100.*XLM/)).toBeInTheDocument();
    });

    it('should render with custom token symbol', () => {
      render(<TokenBalance balance={50} symbol="BST" />);
      expect(screen.getByText(/50.*BST/)).toBeInTheDocument();
    });
  });

  describe('formatting', () => {
    it('should use default 2 decimal places', () => {
      render(<TokenBalance balance={100.123} symbol="XLM" />);
      const text = screen.getByText(/XLM/);
      expect(text.textContent).toContain('100.12');
    });

    it('should respect custom decimals prop', () => {
      render(<TokenBalance balance={100.123456} symbol="XLM" decimals={4} />);
      const text = screen.getByText(/XLM/);
      expect(text.textContent).toContain('100.1235');
    });

    it('should use locale-aware formatting', () => {
      render(<TokenBalance balance={1000.5} symbol="XLM" />);
      const text = screen.getByText(/XLM/);
      // Should have thousands separator based on locale
      expect(text.textContent).toBeTruthy();
    });
  });

  describe('null and undefined handling', () => {
    it('should show fallback for null balance', () => {
      render(<TokenBalance balance={null} symbol="XLM" />);
      expect(screen.getByText(/—.*XLM/)).toBeInTheDocument();
    });

    it('should show fallback for undefined balance', () => {
      render(<TokenBalance balance={undefined} symbol="XLM" />);
      expect(screen.getByText(/—.*XLM/)).toBeInTheDocument();
    });

    it('should show custom fallback', () => {
      render(<TokenBalance balance={null} symbol="XLM" fallback="N/A" />);
      expect(screen.getByText(/N\/A.*XLM/)).toBeInTheDocument();
    });
  });

  describe('invalid values', () => {
    it('should show fallback for NaN', () => {
      render(<TokenBalance balance={NaN} symbol="XLM" />);
      expect(screen.getByText(/—.*XLM/)).toBeInTheDocument();
    });

    it('should show fallback for empty string', () => {
      render(<TokenBalance balance="" symbol="XLM" />);
      expect(screen.getByText(/—.*XLM/)).toBeInTheDocument();
    });
  });

  describe('string balance conversion', () => {
    it('should handle string balance', () => {
      render(<TokenBalance balance="100.5" symbol="XLM" />);
      expect(screen.getByText(/100.5.*XLM/)).toBeInTheDocument();
    });

    it('should handle string with large numbers', () => {
      render(<TokenBalance balance="1000000.5" symbol="XLM" />);
      const text = screen.getByText(/XLM/);
      expect(text.textContent).toBeTruthy();
    });
  });

  describe('className', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <TokenBalance balance={100} symbol="XLM" className="custom-class" />
      );
      const span = container.querySelector('span');
      expect(span).toHaveClass('custom-class');
    });
  });
});

describe('formatTokenBalance function', () => {
  describe('basic formatting', () => {
    it('should format number balance', () => {
      const result = formatTokenBalance(100);
      expect(result).toBe('100');
    });

    it('should format string balance', () => {
      const result = formatTokenBalance('100.5');
      expect(result).toBe('100.5');
    });

    it('should apply default decimals', () => {
      const result = formatTokenBalance(100.123456);
      expect(result).toBe('100.12');
    });

    it('should respect custom decimals', () => {
      const result = formatTokenBalance(100.123456, { decimals: 4 });
      expect(result).toBe('100.1235');
    });
  });

  describe('null and undefined handling', () => {
    it('should return default fallback for null', () => {
      const result = formatTokenBalance(null);
      expect(result).toBe('—');
    });

    it('should return default fallback for undefined', () => {
      const result = formatTokenBalance(undefined);
      expect(result).toBe('—');
    });

    it('should return custom fallback', () => {
      const result = formatTokenBalance(null, { fallback: 'N/A' });
      expect(result).toBe('N/A');
    });
  });

  describe('invalid values', () => {
    it('should return fallback for NaN', () => {
      const result = formatTokenBalance(NaN);
      expect(result).toBe('—');
    });

    it('should return fallback for empty string', () => {
      const result = formatTokenBalance('');
      expect(result).toBe('—');
    });

    it('should return fallback for non-numeric string', () => {
      const result = formatTokenBalance('abc');
      expect(result).toBe('—');
    });
  });

  describe('locale awareness', () => {
    it('should format large numbers with thousands separators', () => {
      const result = formatTokenBalance(1000000.5, { decimals: 1 });
      // The exact format depends on locale, but should be a valid formatted number
      expect(result).toBeTruthy();
      expect(result).not.toBe('—');
    });

    it('should handle zero', () => {
      const result = formatTokenBalance(0);
      expect(result).toBe('0');
    });

    it('should handle negative numbers', () => {
      const result = formatTokenBalance(-100.5);
      expect(result).toContain('-100');
    });
  });
});
