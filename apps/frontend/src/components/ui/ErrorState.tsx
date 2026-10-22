export interface ErrorStateProps {
  title: string;
  message: string;
  errorCode?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title, message, errorCode, onRetry, className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20 ${className ?? ''}`}
    >
      <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">{title}</h2>
      <p className="text-sm text-red-700 dark:text-red-400">{message}</p>
      {errorCode && <p className="text-xs text-red-700 dark:text-red-400">{errorCode}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Retry
        </button>
      )}
    </div>
  );
}
