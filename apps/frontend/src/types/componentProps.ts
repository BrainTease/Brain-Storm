import React from 'react';

export interface BaseComponentProps {
  className?: string;
  id?: string;
  testId?: string;
  'data-testid'?: string;
}

export interface BaseButtonProps extends BaseComponentProps, React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  isDisabled?: boolean;
  children: React.ReactNode;
}

export interface BaseInputProps extends BaseComponentProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  isRequired?: boolean;
  variant?: 'outlined' | 'filled';
}

export interface BaseSelectProps extends BaseComponentProps, React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  isRequired?: boolean;
  options: Array<{ value: string; label: string; disabled?: boolean }>;
}

export interface BaseTextareaProps extends BaseComponentProps, React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  isRequired?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
}

export interface BaseModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  isDismissible?: boolean;
  children: React.ReactNode;
}

export interface BaseCardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  isClickable?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'outlined' | 'filled';
  isPadded?: boolean;
}

export interface BaseFormProps extends BaseComponentProps {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
  isSubmitting?: boolean;
  submitButtonLabel?: string;
  showSubmitButton?: boolean;
}

export interface BaseBadgeProps extends BaseComponentProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  rounded?: boolean;
}

export interface BaseProgressProps extends BaseComponentProps {
  value: number;
  max?: number;
  label?: string;
  showLabel?: boolean;
  animated?: boolean;
  variant?: 'primary' | 'success' | 'warning' | 'error';
}

export interface BasePaginationProps extends BaseComponentProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  canPreviousPage?: boolean;
  canNextPage?: boolean;
}

export interface BaseListProps extends BaseComponentProps {
  items: Array<unknown>;
  onItemClick?: (item: unknown, index: number) => void;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}
