import { useState, useCallback, useRef } from 'react';

interface UseAsyncReturn<T> {
  /** Execute the async function with optional arguments */
  execute: (...args: unknown[]) => Promise<T | null>;
  /** Result data, null until successful execution */
  data: T | null;
  /** True while the async function is running */
  loading: boolean;
  /** Error from the last failed execution, null otherwise */
  error: Error | null;
  /** Reset all state to initial values */
  reset: () => void;
}

/**
 * Generic hook for async operations with loading/error states.
 * Designed for on-demand execution (e.g., form submit), not fetch-on-mount.
 *
 * @param asyncFn - The async function to execute
 * @returns Object with execute, data, loading, error, reset
 */
export function useAsync<T>(asyncFn: (...args: unknown[]) => Promise<T>): UseAsyncReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Keep asyncFn ref to avoid re-creating execute on every render
  const asyncFnRef = useRef(asyncFn);
  asyncFnRef.current = asyncFn;

  const execute = useCallback(async (...args: unknown[]): Promise<T | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFnRef.current(...args);
      setData(result);
      return result;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { execute, data, loading, error, reset };
}
