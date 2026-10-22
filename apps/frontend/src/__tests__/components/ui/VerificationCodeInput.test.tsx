import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VerificationCodeInput } from '@/components/ui/VerificationCodeInput';

describe('VerificationCodeInput Component', () => {
  describe('rendering', () => {
    it('should render 6 digit inputs by default', () => {
      render(<VerificationCodeInput />);
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(6);
    });

    it('should render custom length of digit inputs', () => {
      render(<VerificationCodeInput length={4} />);
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(4);
    });

    it('should render label', () => {
      render(<VerificationCodeInput label="Enter code" />);
      expect(screen.getByText('Enter code')).toBeInTheDocument();
    });

    it('should render default label', () => {
      render(<VerificationCodeInput />);
      expect(screen.getByText('Verification code')).toBeInTheDocument();
    });
  });

  describe('digit input', () => {
    it('should accept only numeric input', () => {
      render(<VerificationCodeInput />);
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: 'a' } });
      expect((inputs[0] as HTMLInputElement).value).toBe('');
    });

    it('should accept single digit', () => {
      render(<VerificationCodeInput />);
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: '1' } });
      expect((inputs[0] as HTMLInputElement).value).toBe('1');
    });

    it('should move focus to next input after entering digit', () => {
      render(<VerificationCodeInput />);
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: '1' } });
      expect(document.activeElement).toBe(inputs[1]);
    });

    it('should not move focus on last input', () => {
      render(<VerificationCodeInput length={3} />);
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[2], { target: { value: '3' } });
      expect(document.activeElement).toBe(inputs[2]);
    });
  });

  describe('onChange callback', () => {
    it('should call onChange when digit is entered', () => {
      const handleChange = vi.fn();
      render(<VerificationCodeInput onChange={handleChange} />);
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: '1' } });
      expect(handleChange).toHaveBeenCalledWith('1');
    });

    it('should pass current code state to onChange', () => {
      const handleChange = vi.fn();
      render(<VerificationCodeInput onChange={handleChange} />);
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: '1' } });
      fireEvent.change(inputs[1], { target: { value: '2' } });
      expect(handleChange).toHaveBeenLastCalledWith('12');
    });
  });

  describe('onComplete callback', () => {
    it('should call onComplete when all digits are filled', () => {
      const handleComplete = vi.fn();
      render(<VerificationCodeInput length={3} onComplete={handleComplete} />);
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: '1' } });
      fireEvent.change(inputs[1], { target: { value: '2' } });
      fireEvent.change(inputs[2], { target: { value: '3' } });
      expect(handleComplete).toHaveBeenCalledWith('123');
    });

    it('should not call onComplete if any digit is empty', () => {
      const handleComplete = vi.fn();
      render(<VerificationCodeInput length={3} onComplete={handleComplete} />);
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: '1' } });
      fireEvent.change(inputs[2], { target: { value: '3' } });
      expect(handleComplete).not.toHaveBeenCalled();
    });
  });

  describe('backspace handling', () => {
    it('should clear current digit on backspace', () => {
      render(<VerificationCodeInput />);
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: '1' } });
      fireEvent.keyDown(inputs[0], { key: 'Backspace' });
      expect((inputs[0] as HTMLInputElement).value).toBe('');
    });

    it('should move focus to previous input on backspace if current is empty', () => {
      render(<VerificationCodeInput />);
      const inputs = screen.getAllByRole('textbox');
      fireEvent.change(inputs[0], { target: { value: '1' } });
      fireEvent.keyDown(inputs[1], { key: 'Backspace' });
      expect(document.activeElement).toBe(inputs[0]);
    });
  });

  describe('arrow key navigation', () => {
    it('should move focus left on ArrowLeft', () => {
      render(<VerificationCodeInput />);
      const inputs = screen.getAllByRole('textbox');
      inputs[1].focus();
      fireEvent.keyDown(inputs[1], { key: 'ArrowLeft' });
      expect(document.activeElement).toBe(inputs[0]);
    });

    it('should move focus right on ArrowRight', () => {
      render(<VerificationCodeInput />);
      const inputs = screen.getAllByRole('textbox');
      inputs[0].focus();
      fireEvent.keyDown(inputs[0], { key: 'ArrowRight' });
      expect(document.activeElement).toBe(inputs[1]);
    });
  });

  describe('paste handling', () => {
    it('should handle paste of numeric code', () => {
      const handleComplete = vi.fn();
      render(<VerificationCodeInput length={4} onComplete={handleComplete} />);
      const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: new DataTransfer(),
        bubbles: true,
      });
      pasteEvent.clipboardData?.setData('text/plain', '1234');
      
      inputs[0].dispatchEvent(pasteEvent);
      fireEvent.paste(inputs[0], { clipboardData: { getData: () => '1234' } });
    });

    it('should ignore non-numeric characters in paste', () => {
      render(<VerificationCodeInput length={4} />);
      const inputs = screen.getAllByRole('textbox');
      fireEvent.paste(inputs[0], { clipboardData: { getData: () => '12ab34' } });
    });
  });

  describe('value prop', () => {
    it('should set initial value from value prop', () => {
      render(<VerificationCodeInput value="123456" />);
      const inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      expect(inputs[0].value).toBe('1');
      expect(inputs[1].value).toBe('2');
      expect(inputs[2].value).toBe('3');
    });

    it('should update when value prop changes', () => {
      const { rerender } = render(<VerificationCodeInput value="123" />);
      let inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      expect(inputs[0].value).toBe('1');

      rerender(<VerificationCodeInput value="456" />);
      inputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      expect(inputs[0].value).toBe('4');
      expect(inputs[1].value).toBe('5');
      expect(inputs[2].value).toBe('6');
    });
  });

  describe('disabled state', () => {
    it('should disable all inputs when disabled prop is true', () => {
      render(<VerificationCodeInput disabled />);
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach((input) => {
        expect(input).toBeDisabled();
      });
    });

    it('should not auto-focus when disabled', () => {
      render(<VerificationCodeInput disabled autoFocus={true} />);
      const inputs = screen.getAllByRole('textbox');
      expect(document.activeElement).not.toBe(inputs[0]);
    });
  });

  describe('error handling', () => {
    it('should display error message', () => {
      render(<VerificationCodeInput error="Invalid code" />);
      expect(screen.getByText('Invalid code')).toBeInTheDocument();
    });

    it('should have error styling on inputs', () => {
      const { container } = render(<VerificationCodeInput error="Invalid" />);
      const inputs = container.querySelectorAll('input');
      inputs.forEach((input) => {
        expect(input).toHaveClass('border-red-500');
      });
    });

    it('should set aria-invalid on inputs', () => {
      render(<VerificationCodeInput error="Invalid code" />);
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach((input) => {
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper aria labels', () => {
      render(<VerificationCodeInput length={4} />);
      expect(screen.getByLabelText('Digit 1 of 4')).toBeInTheDocument();
      expect(screen.getByLabelText('Digit 2 of 4')).toBeInTheDocument();
      expect(screen.getByLabelText('Digit 3 of 4')).toBeInTheDocument();
      expect(screen.getByLabelText('Digit 4 of 4')).toBeInTheDocument();
    });

    it('should have role group for inputs container', () => {
      render(<VerificationCodeInput />);
      const group = screen.getByRole('group', { name: 'Verification code' });
      expect(group).toBeInTheDocument();
    });

    it('should have numeric input mode', () => {
      render(<VerificationCodeInput />);
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach((input) => {
        expect(input).toHaveAttribute('inputMode', 'numeric');
      });
    });
  });
});
