import { BaseButtonProps } from '@/types/componentProps';

type ButtonVariant = 'primary' | 'outline' | 'secondary' | 'danger';

interface ButtonProps extends Omit<BaseButtonProps, 'variant'> {
  variant?: Exclude<ButtonVariant, undefined>;
}

export function Button({
  variant = 'primary',
  type = 'button',
  children,
  className = '',
  isDisabled,
  disabled: htmlDisabled,
  ...props
}: ButtonProps) {
  const isActuallyDisabled = isDisabled || htmlDisabled;
  const base =
    'px-4 py-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rtl:px-4';
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700',
    outline:
      'border-2 border-blue-700 text-blue-700 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
    danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800',
  };
  return (
    <button type={type} className={`${base} ${styles[variant]} ${className}`} disabled={isActuallyDisabled} {...props}>
      {children}
    </button>
  );
}
