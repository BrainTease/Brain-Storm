export function isChunkLoadError(error: unknown): boolean {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  return (
    msg.includes('Failed to fetch') ||
    msg.includes('Loading chunk') ||
    msg.includes('ChunkLoadError') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading CSS chunk') ||
    msg.includes('dynamically imported module')
  );
}

export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  if (error instanceof TypeError && error.message === 'Failed to fetch') return true;
  if (error instanceof Error && error.message?.includes('NetworkError')) return true;
  if (error instanceof Error && error.message?.includes('network')) return true;
  return false;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error)
    return String((error as { message: unknown }).message);
  return 'An unexpected error occurred.';
}

export type ErrorCategory = 'chunk-load' | 'network' | 'runtime' | 'unknown';

export function categorizeError(error: unknown): ErrorCategory {
  if (isChunkLoadError(error)) return 'chunk-load';
  if (isNetworkError(error)) return 'network';
  return 'runtime';
}

export function getErrorTitle(category: ErrorCategory): string {
  switch (category) {
    case 'chunk-load':
      return 'New version available';
    case 'network':
      return 'No internet connection';
    case 'runtime':
      return 'Something went wrong';
    default:
      return 'Something went wrong';
  }
}

export function getErrorDescription(category: ErrorCategory): string {
  switch (category) {
    case 'chunk-load':
      return 'A new version of the app was deployed. Please refresh to get the latest update.';
    case 'network':
      return 'Please check your internet connection and try again.';
    case 'runtime':
      return 'An unexpected error occurred. Please try again or report the issue.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}
