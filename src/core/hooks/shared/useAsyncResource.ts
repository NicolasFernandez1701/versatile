import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncResourceOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
}

export interface RefetchOptions {
  silent?: boolean;
}

export interface AsyncResourceResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: (options?: RefetchOptions) => Promise<void>;
}

interface PendingRefetch {
  resolve: () => void;
  request: number | null;
}

function toError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason));
}

/**
 * Shared async-resource state machine and the single sanctioned
 * `react-hooks/set-state-in-effect` location in production code.
 *
 * Contract: keyed effect + effect-updated refs (AD-1/AD-6), keep-previous-data
 * with blocking/silent refetch parity (AD-2), single-resource instances
 * composed by consumers (AD-3), monotonic request-id newest-wins plus an
 * unmount guard — services accept no AbortSignal, so the id/aborted check is
 * the correctness guarantee, not transport cancellation (AD-4), awaitable
 * never-rejecting coalesced refetch (AD-5), newest-request-only error surface
 * via onError (AD-9).
 */
export function useAsyncResource<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  keys: ReadonlyArray<unknown>,
  options?: AsyncResourceOptions,
): AsyncResourceResult<T> {
  const enabled = options?.enabled ?? true;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<Error | null>(null);
  const [trigger, setTrigger] = useState(0);

  const fetcherRef = useRef(fetcher);
  const onErrorRef = useRef(options?.onError);
  const requestIdRef = useRef(0);
  const silentRef = useRef(false);
  const pendingRef = useRef<PendingRefetch[]>([]);

  // Effect-updated refs: render-time ref writes are forbidden by
  // `react-hooks/refs`, so freshness lives here. Declared BEFORE the fetch
  // effect so every fetch run observes the current render's fetcher without
  // retriggering on inline-closure identity churn.
  useEffect(() => {
    fetcherRef.current = fetcher;
    onErrorRef.current = options?.onError;
  });

  const refetch = useCallback((refetchOptions?: RefetchOptions): Promise<void> => {
    if (refetchOptions?.silent === true) {
      silentRef.current = true;
    }
    return new Promise<void>((resolve) => {
      pendingRef.current.push({ resolve, request: null });
      setTrigger((value) => value + 1);
    });
  }, []);

  useEffect(() => {
    const blocking = !silentRef.current;
    silentRef.current = false;

    // The single sanctioned synchronous state write (spec: centralized
    // suppression): the functional updater covers the disabled / blocking /
    // silent branches in one call. Kept even though
    // eslint-plugin-react-hooks 7.1.1 does not trace the updater form (hence
    // the unused-directive warning): it documents the sanctioned site and
    // future-proofs a plugin upgrade that traces updaters.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading((previous) => {
      if (!enabled) return false;
      if (blocking) return true;
      return previous;
    });

    if (!enabled) {
      // Disabled gate: no fetch, and every waiter resolves immediately so a
      // refetch issued while disabled never hangs.
      const pending = pendingRef.current;
      pendingRef.current = [];
      pending.forEach((entry) => {
        entry.resolve();
      });
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const controller = new AbortController();

    // Adopt waiters that arrived since the previous run into this request.
    // Waiters adopted by older runs were resolved by their cleanup below.
    pendingRef.current.forEach((entry) => {
      if (entry.request === null) {
        entry.request = requestId;
      }
    });

    const settle = (commit: () => void) => {
      if (requestIdRef.current !== requestId || controller.signal.aborted) {
        return;
      }
      commit();
      const pending = pendingRef.current;
      pendingRef.current = pending.filter((entry) => entry.request !== requestId);
      pending.forEach((entry) => {
        if (entry.request === requestId) {
          entry.resolve();
        }
      });
    };

    fetcherRef.current(controller.signal).then(
      (value) => {
        settle(() => {
          setData(value);
          setError(null);
          setLoading(false);
        });
      },
      (reason: unknown) => {
        const failure = toError(reason);
        settle(() => {
          setError(failure);
          setLoading(false);
          onErrorRef.current?.(failure);
        });
      },
    );

    return () => {
      controller.abort();
      // Superseded (or unmounted) run: its waiters resolve now, never hang.
      const pending = pendingRef.current;
      pendingRef.current = pending.filter((entry) => entry.request !== requestId);
      pending.forEach((entry) => {
        if (entry.request === requestId) {
          entry.resolve();
        }
      });
      // Waiters whose triggering run never started (adopted by no run yet)
      // resolve on the next tick — unless the upcoming effect run adopts them
      // first, which always happens synchronously before microtasks flush.
      queueMicrotask(() => {
        const leftover = pendingRef.current;
        pendingRef.current = leftover.filter((entry) => entry.request !== null);
        leftover.forEach((entry) => {
          if (entry.request === null) {
            entry.resolve();
          }
        });
      });
    };
  }, [...keys, trigger, enabled]);

  return { data, loading, error, refetch };
}
