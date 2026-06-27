import { useCallback, useRef, useState } from 'react';
import { toast } from './toast';

interface OptimisticState<T> {
  data: T;
  pending: boolean;
  error: Error | null;
}

type OptimisticAction<T> = (current: T) => T;

export function useOptimistic<T>(initialData: T) {
  const [state, setState] = useState<OptimisticState<T>>({
    data: initialData,
    pending: false,
    error: null,
  });
  const rollbackRef = useRef<T>(initialData);

  const execute = useCallback(
    async (
      optimisticUpdate: OptimisticAction<T>,
      apiCall: () => Promise<void>,
      reconcile?: (current: T) => T,
    ) => {
      rollbackRef.current = state.data;
      const optimisticData = optimisticUpdate(state.data);

      setState({ data: optimisticData, pending: true, error: null });

      try {
        await apiCall();
        setState((prev) => ({
          data: reconcile ? reconcile(prev.data) : prev.data,
          pending: false,
          error: null,
        }));
      } catch (err) {
        setState({ data: rollbackRef.current, pending: false, error: err as Error });
        const message =
          err instanceof Error ? err.message : 'Action failed. Changes reverted.';
        toast.error(message);
      }
    },
    [state.data],
  );

  const reset = useCallback(() => {
    setState({ data: rollbackRef.current, pending: false, error: null });
  }, []);

  return { ...state, execute, reset };
}
