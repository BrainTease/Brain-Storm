import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Textarea } from '@/components/ui/Textarea';

describe('Textarea Component', () => {
  describe('rendering', () => {
    it('should render textarea element', () => {
      render(<Textarea label="Description" />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render label', () => {
      render(<Textarea label="Test Label" />);
      expect(screen.getByText('Test Label')).toBeInTheDocument();
    });
  });

  describe('value handling', () => {
    it('should handle initial value', () => {
      render(<Textarea label="Text" defaultValue="Initial text" />);
      const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Initial text');
    });

    it('should handle change events', () => {
      const handleChange = vi.fn();
      render(<Textarea label="Text" onChange={handleChange} />);
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'new text' } });
      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('placeholder', () => {
    it('should support placeholder attribute', () => {
      render(<Textarea label="Text" placeholder="Enter description" />);
      const textarea = screen.getByPlaceholderText('Enter description');
      expect(textarea).toBeInTheDocument();
    });
  });

  describe('disabled state', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Textarea label="Text" disabled />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });
  });

  describe('error handling', () => {
    it('should display error message', () => {
      render(<Textarea label="Text" error="This field is required" />);
      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });
  });

  describe('helper text', () => {
    it('should display helper text', () => {
      render(<Textarea label="Text" helperText="Max 500 characters" />);
      expect(screen.getByText('Max 500 characters')).toBeInTheDocument();
    });
  });

  describe('ref forwarding', () => {
    it('should forward ref to textarea element', () => {
      const ref = { current: null };
      render(<Textarea label="Text" ref={ref} />);
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
    });
  });
});
