export interface ErrorStateProps {
  title: string;
  message: string;
  errorCode?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ title, message, errorCode, onRetry, className }: ErrorStateProps) {
  return (
    <div className={className} role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      {errorCode && <p>{errorCode}</p>}
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  );
}
