import { describe, it, expect } from 'vitest';
import type {
  BaseComponentProps,
  BaseButtonProps,
  BaseInputProps,
  BaseSelectProps,
  BaseModalProps,
  BaseCardProps,
  BaseFormProps,
} from '@/types/componentProps';

describe('componentProps types', () => {
  describe('BaseComponentProps', () => {
    it('should define common component properties', () => {
      const props: BaseComponentProps = {
        className: 'custom-class',
        id: 'component-id',
        testId: 'component-test-id',
      };

      expect(props.className).toBe('custom-class');
      expect(props.id).toBe('component-id');
      expect(props.testId).toBe('component-test-id');
    });
  });

  describe('BaseButtonProps', () => {
    it('should extend BaseComponentProps and HTMLButtonElement', () => {
      const props: BaseButtonProps = {
        className: 'button-class',
        variant: 'primary',
        size: 'md',
        isLoading: false,
        isDisabled: false,
        children: 'Click me',
        onClick: () => {},
      };

      expect(props.className).toBe('button-class');
      expect(props.variant).toBe('primary');
      expect(props.size).toBe('md');
      expect(props.children).toBe('Click me');
    });

    it('should support all button variants', () => {
      const variants: Array<BaseButtonProps['variant']> = [
        'primary',
        'outline',
        'secondary',
        'danger',
      ];

      variants.forEach((variant) => {
        const props: BaseButtonProps = {
          variant,
          children: 'test',
        };
        expect(props.variant).toBe(variant);
      });
    });

    it('should support all button sizes', () => {
      const sizes: Array<BaseButtonProps['size']> = ['sm', 'md', 'lg'];

      sizes.forEach((size) => {
        const props: BaseButtonProps = {
          size,
          children: 'test',
        };
        expect(props.size).toBe(size);
      });
    });
  });

  describe('BaseInputProps', () => {
    it('should define input-specific properties', () => {
      const props: BaseInputProps = {
        label: 'Username',
        error: 'Required field',
        helperText: 'Enter your username',
        isRequired: true,
        variant: 'outlined',
      };

      expect(props.label).toBe('Username');
      expect(props.error).toBe('Required field');
      expect(props.helperText).toBe('Enter your username');
      expect(props.isRequired).toBe(true);
    });
  });

  describe('BaseSelectProps', () => {
    it('should define select-specific properties', () => {
      const props: BaseSelectProps = {
        label: 'Choose option',
        options: [
          { value: '1', label: 'Option 1' },
          { value: '2', label: 'Option 2' },
        ],
      };

      expect(props.label).toBe('Choose option');
      expect(props.options).toHaveLength(2);
      expect(props.options[0].value).toBe('1');
    });
  });

  describe('BaseModalProps', () => {
    it('should define modal-specific properties', () => {
      const props: BaseModalProps = {
        isOpen: true,
        onClose: () => {},
        title: 'Modal Title',
        description: 'Modal description',
        size: 'md',
        isDismissible: true,
        children: 'Modal content',
      };

      expect(props.isOpen).toBe(true);
      expect(props.title).toBe('Modal Title');
      expect(props.size).toBe('md');
      expect(props.isDismissible).toBe(true);
    });
  });

  describe('BaseCardProps', () => {
    it('should define card-specific properties', () => {
      const props: BaseCardProps = {
        title: 'Card Title',
        subtitle: 'Card subtitle',
        children: 'Card content',
        isClickable: true,
        variant: 'outlined',
        isPadded: true,
      };

      expect(props.title).toBe('Card Title');
      expect(props.isClickable).toBe(true);
      expect(props.variant).toBe('outlined');
    });
  });

  describe('BaseFormProps', () => {
    it('should define form-specific properties', () => {
      const props: BaseFormProps = {
        onSubmit: () => {},
        children: 'Form fields',
        isSubmitting: false,
        submitButtonLabel: 'Submit',
        showSubmitButton: true,
      };

      expect(props.isSubmitting).toBe(false);
      expect(props.submitButtonLabel).toBe('Submit');
      expect(props.showSubmitButton).toBe(true);
    });
  });
});
