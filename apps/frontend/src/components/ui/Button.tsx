interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  type = 'button',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const base =
    'px-4 py-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const styles = {
    primary: 'bg-blue-700 text-white hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700',
    outline:
      'border-2 border-blue-700 text-blue-700 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950',
  };
  return (
    <button type={type} className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
