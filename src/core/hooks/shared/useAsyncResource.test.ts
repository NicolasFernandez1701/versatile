import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAsyncResource, keysEqual } from './useAsyncResource';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useAsyncResource', () => {
  it('reports loading on mount and commits data after the fetcher settles', async () => {
    const gate = deferred<string>();
    const { result } = renderHook(() => useAsyncResource(() => gate.promise, ['k1']));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    await act(async () => {
      gate.resolve('V');
    });

    expect(result.current.data).toBe('V');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('performs no work and never sticks loading when disabled', async () => {
    let calls = 0;
    const { result } = renderHook(() =>
      useAsyncResource(
        () => {
          calls += 1;
          return Promise.resolve('V');
        },
        ['k1'],
        { enabled: false },
      ),
    );

    expect(calls).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();

    await act(async () => {});
    expect(calls).toBe(0);
    expect(result.current.loading).toBe(false);
  });

  it('keeps previous data visible during a blocking refetch and flips loading', async () => {
    const gates: Array<Deferred<string>> = [];
    const { result } = renderHook(() =>
      useAsyncResource(() => {
        const gate = deferred<string>();
        gates.push(gate);
        return gate.promise;
      }, ['k1']),
    );

    await act(async () => {
      gates[0].resolve('A');
    });
    expect(result.current.data).toBe('A');

    act(() => {
      void result.current.refetch();
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe('A');

    await act(async () => {
      gates[1].resolve('B');
    });
    expect(result.current.data).toBe('B');
    expect(result.current.loading).toBe(false);
  });

  it('never flips loading on a silent refetch but still commits the new data', async () => {
    const gates: Array<Deferred<string>> = [];
    const { result } = renderHook(() =>
      useAsyncResource(() => {
        const gate = deferred<string>();
        gates.push(gate);
        return gate.promise;
      }, ['k1']),
    );

    await act(async () => {
      gates[0].resolve('A');
    });
    expect(result.current.loading).toBe(false);

    act(() => {
      void result.current.refetch({ silent: true });
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe('A');

    await act(async () => {
      gates[1].resolve('B');
    });
    expect(result.current.data).toBe('B');
    expect(result.current.loading).toBe(false);
  });

  it('refetches when a key changes', async () => {
    const gates: Array<Deferred<string>> = [];
    const { result, rerender } = renderHook(({ keys }: { keys: Array<string> }) =>
      useAsyncResource(() => {
        const gate = deferred<string>();
        gates.push(gate);
        return gate.promise;
      }, keys),
      { initialProps: { keys: ['a'] } },
    );

    await act(async () => {
      gates[0].resolve('A');
    });
    expect(result.current.data).toBe('A');
    expect(gates).toHaveLength(1);

    rerender({ keys: ['b'] });
    expect(gates).toHaveLength(2);
    expect(result.current.loading).toBe(true);

    await act(async () => {
      gates[1].resolve('B');
    });
    expect(result.current.data).toBe('B');
    expect(result.current.loading).toBe(false);
  });

  it('does not refetch when only the fetcher identity changes', async () => {
    const gate = deferred<string>();
    let calls = 0;
    const { result, rerender } = renderHook(() =>
      useAsyncResource(() => {
        calls += 1;
        return gate.promise;
      }, ['stable']),
    );

    rerender();
    rerender();
    rerender();
    expect(calls).toBe(1);

    await act(async () => {
      gate.resolve('V');
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe('V');
    expect(calls).toBe(1);
  });

  it('keeps only the newest response when requests settle out of order', async () => {
    const gates: Array<Deferred<string>> = [];
    const { result, rerender } = renderHook(({ keys }: { keys: Array<string> }) =>
      useAsyncResource(() => {
        const gate = deferred<string>();
        gates.push(gate);
        return gate.promise;
      }, keys),
      { initialProps: { keys: ['a'] } },
    );

    rerender({ keys: ['b'] });
    expect(gates).toHaveLength(2);

    await act(async () => {
      gates[1].resolve('B');
    });
    expect(result.current.data).toBe('B');

    await act(async () => {
      gates[0].resolve('A-late');
    });
    expect(result.current.data).toBe('B');
    expect(result.current.loading).toBe(false);
  });

  it('discards a stale rejection without surfacing an error', async () => {
    const gates: Array<Deferred<string>> = [];
    const onError = vi.fn(() => undefined);
    const { result, rerender } = renderHook(({ keys }: { keys: Array<string> }) =>
      useAsyncResource(
        () => {
          const gate = deferred<string>();
          gates.push(gate);
          return gate.promise;
        },
        keys,
        { onError },
      ),
      { initialProps: { keys: ['a'] } },
    );

    rerender({ keys: ['b'] });
    await act(async () => {
      gates[1].resolve('B');
    });
    expect(result.current.data).toBe('B');
    expect(result.current.error).toBeNull();

    await act(async () => {
      gates[0].reject(new Error('stale'));
    });
    expect(result.current.data).toBe('B');
    expect(result.current.error).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });

  it('aborts the in-flight request on unmount and ignores its late settle', async () => {
    const gates: Array<Deferred<string>> = [];
    const signals: Array<AbortSignal> = [];
    const { unmount } = renderHook(() =>
      useAsyncResource((signal) => {
        signals.push(signal);
        const gate = deferred<string>();
        gates.push(gate);
        return gate.promise;
      }, ['k1']),
    );

    expect(signals).toHaveLength(1);
    unmount();
    expect(signals[0].aborted).toBe(true);

    await act(async () => {
      gates[0].resolve('late');
    });
  });

  it('surfaces rejection as error, keeps previous data, and notifies once', async () => {
    const gates: Array<Deferred<string>> = [];
    const onError = vi.fn(() => undefined);
    const { result } = renderHook(() =>
      useAsyncResource(
        () => {
          const gate = deferred<string>();
          gates.push(gate);
          return gate.promise;
        },
        ['k1'],
        { onError },
      ),
    );

    await act(async () => {
      gates[0].resolve('A');
    });
    expect(result.current.data).toBe('A');

    act(() => {
      void result.current.refetch();
    });
    await act(async () => {
      gates[1].reject(new Error('boom'));
    });

    expect(result.current.data).toBe('A');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('boom');
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(result.current.error);
  });

  it('resolves the refetch promise only after the triggered request settles', async () => {
    const gates: Array<Deferred<string>> = [];
    const { result } = renderHook(() =>
      useAsyncResource(() => {
        const gate = deferred<string>();
        gates.push(gate);
        return gate.promise;
      }, ['k1']),
    );

    await act(async () => {
      gates[0].resolve('A');
    });

    let refetchPromise!: Promise<void>;
    act(() => {
      refetchPromise = result.current.refetch();
    });
    let resolved = false;
    void refetchPromise.then(() => {
      resolved = true;
    });

    await act(async () => {});
    expect(resolved).toBe(false);

    await act(async () => {
      gates[1].resolve('B');
    });
    await refetchPromise;
    expect(resolved).toBe(true);
    expect(result.current.data).toBe('B');
  });

  it('coalesces refetches from the same tick into a single request', async () => {
    const gates: Array<Deferred<string>> = [];
    const { result } = renderHook(() =>
      useAsyncResource(() => {
        const gate = deferred<string>();
        gates.push(gate);
        return gate.promise;
      }, ['k1']),
    );

    await act(async () => {
      gates[0].resolve('A');
    });

    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.refetch();
      second = result.current.refetch();
    });
    expect(gates).toHaveLength(2);

    let firstResolved = false;
    let secondResolved = false;
    void first.then(() => {
      firstResolved = true;
    });
    void second.then(() => {
      secondResolved = true;
    });

    await act(async () => {
      gates[1].resolve('B');
    });
    await first;
    await second;
    expect(firstResolved).toBe(true);
    expect(secondResolved).toBe(true);
    expect(result.current.data).toBe('B');
  });

  it('resolves a superseded refetch instead of hanging', async () => {
    const gates: Array<Deferred<string>> = [];
    const { result, rerender } = renderHook(({ keys }: { keys: Array<string> }) =>
      useAsyncResource(() => {
        const gate = deferred<string>();
        gates.push(gate);
        return gate.promise;
      }, keys),
      { initialProps: { keys: ['a'] } },
    );

    await act(async () => {
      gates[0].resolve('A');
    });

    let refetchPromise!: Promise<void>;
    act(() => {
      refetchPromise = result.current.refetch();
    });
    await act(async () => {});
    expect(gates).toHaveLength(2);

    rerender({ keys: ['b'] });
    await refetchPromise;
    expect(gates).toHaveLength(3);

    await act(async () => {
      gates[2].resolve('B');
    });
    await act(async () => {
      gates[1].resolve('A-stale');
    });
    expect(result.current.data).toBe('B');
  });

  it('resolves refetch immediately while disabled', async () => {
    const { result } = renderHook(() =>
      useAsyncResource(() => Promise.resolve('V'), ['k1'], { enabled: false }),
    );

    let refetchPromise!: Promise<void>;
    act(() => {
      refetchPromise = result.current.refetch();
    });
    await refetchPromise;
    expect(result.current.loading).toBe(false);
  });

  it('resolves a pending refetch when unmount happens in the same tick', async () => {
    const gates: Array<Deferred<string>> = [];
    const { result, unmount } = renderHook(() =>
      useAsyncResource(() => {
        const gate = deferred<string>();
        gates.push(gate);
        return gate.promise;
      }, ['k1']),
    );

    await act(async () => {
      gates[0].resolve('A');
    });

    let refetchPromise!: Promise<void>;
    act(() => {
      refetchPromise = result.current.refetch();
      unmount();
    });
    await refetchPromise;
  });

  it('does not refetch when the keys array is recreated with equal values', async () => {
    let calls = 0;
    const { result, rerender } = renderHook(
      ({ stamp }: { stamp: number }) =>
        useAsyncResource(
          () => {
            calls += 1;
            return Promise.resolve(`V${stamp}`);
          },
          // Fresh array identity on every render, same element values.
          ['k1', stamp > 0 ? 'same' : 'same'],
        ),
      { initialProps: { stamp: 0 } },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(calls).toBe(1);

    // Unrelated prop change recreates the keys array with identical values.
    rerender({ stamp: 1 });
    rerender({ stamp: 2 });

    await act(async () => {});
    expect(calls).toBe(1);
    expect(result.current.data).toBe('V0');
  });
});

describe('keysEqual', () => {
  it('reports equal arrays with identical elements', () => {
    expect(keysEqual(['a', 1, true], ['a', 1, true])).toBe(true);
  });

  it('reports empty arrays as equal', () => {
    expect(keysEqual([], [])).toBe(true);
  });

  it('reports changed elements as different', () => {
    expect(keysEqual(['a'], ['b'])).toBe(false);
  });

  it('reports different lengths as different', () => {
    expect(keysEqual(['a'], ['a', 'b'])).toBe(false);
    expect(keysEqual(['a', 'b'], ['a'])).toBe(false);
  });

  it('compares by identity, so NaN equals NaN and objects compare by reference', () => {
    expect(keysEqual([Number.NaN], [Number.NaN])).toBe(true);
    const shared = { id: 1 };
    expect(keysEqual([shared], [shared])).toBe(true);
    expect(keysEqual([{ id: 1 }], [{ id: 1 }])).toBe(false);
  });
});
