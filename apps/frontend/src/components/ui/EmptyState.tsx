interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div className={className}>
      {icon || <svg />}
      <h2>{title}</h2>
      <p>{description}</p>
      {actionLabel && onAction && <button onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}
