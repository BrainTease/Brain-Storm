import { Spinner } from '@/components/ui/Spinner';

export interface LoadingStateProps {
  label?: string;
  description?: string;
  className?: string;
}

export function LoadingState({ label = 'Loading…', description, className }: LoadingStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-center ${className ?? ''}`}
    >
      <Spinner size="lg" label={label} />
      <p aria-hidden="true" className="text-sm text-gray-600 dark:text-gray-400">
        {label}
      </p>
      {description && <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>}
    </div>
  );
}
