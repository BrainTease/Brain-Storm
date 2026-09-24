export interface LoadingStateProps {
  label?: string;
  description?: string;
  className?: string;
}

export function LoadingState({ label = 'Loading…', description, className }: LoadingStateProps) {
  return (
    <div className={className}>
      <div role="status" aria-label={label}>
        <svg />
      </div>
      {description && <p>{description}</p>}
    </div>
  );
}
