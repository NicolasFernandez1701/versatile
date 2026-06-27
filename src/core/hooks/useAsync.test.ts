import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAsync } from './useAsync';

describe('useAsync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initial state is clean', () => {
    const asyncFn = vi.fn().mockResolvedValue('result');
    const { result } = renderHook(() => useAsync(asyncFn));

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('successful execution: data populated, loading false, error null', async () => {
    const asyncFn = vi.fn<() => Promise<string>>().mockImplementation(
      () => new Promise<string>((resolve) => setTimeout(() => resolve('ok'), 100))
    );
    const { result } = renderHook(() => useAsync(asyncFn));

    let executePromise: Promise<string | null>;
    await act(async () => {
      executePromise = result.current.execute();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(100);
      await executePromise;
    });

    expect(result.current.data).toBe('ok');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('failed execution: error populated, loading false, data null', async () => {
    const asyncFn = vi.fn<() => Promise<string>>().mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('Network error')), 100))
    );
    const { result } = renderHook(() => useAsync(asyncFn));

    let executePromise: Promise<string | null>;
    await act(async () => {
      executePromise = result.current.execute();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      vi.advanceTimersByTime(100);
      try {
        await executePromise;
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('reset clears all state after success', async () => {
    const asyncFn = vi.fn().mockResolvedValue('done');
    const { result } = renderHook(() => useAsync(asyncFn));

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.data).toBe('done');

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('reset clears all state after error', async () => {
    const asyncFn = vi.fn().mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useAsync(asyncFn));

    await act(async () => {
      try {
        await result.current.execute();
      } catch {
        // expected
      }
    });

    expect(result.current.error).toBeInstanceOf(Error);

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('passes arguments to the async function', async () => {
    const asyncFn = vi.fn().mockResolvedValue('ok');
    const { result } = renderHook(() => useAsync(asyncFn));

    await act(async () => {
      await result.current.execute('arg1', 42);
    });

    expect(asyncFn).toHaveBeenCalledWith('arg1', 42);
  });

  it('can be executed multiple times', async () => {
    let counter = 0;
    const asyncFn = vi.fn().mockImplementation(() => ++counter);
    const { result } = renderHook(() => useAsync(asyncFn));

    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.data).toBe(1);

    await act(async () => {
      await result.current.execute();
    });
    expect(result.current.data).toBe(2);
  });
});
