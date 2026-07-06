import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDateInput } from './useDateInput';

function changeValue(result: { current: ReturnType<typeof useDateInput> }, value: string) {
  act(() => {
    result.current.handleChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>);
  });
}

describe('useDateInput', () => {
  it('formats digits as DD/MM/YYYY when typing 8 digits', () => {
    const { result } = renderHook(() => useDateInput());

    changeValue(result, '25101990');

    expect(result.current.value).toBe('25/10/1990');
  });

  it('strips non-digits and formats the date', () => {
    const { result } = renderHook(() => useDateInput());

    changeValue(result, '2a5b1c0d1e9f9g0h');

    expect(result.current.value).toBe('25/10/1990');
  });

  it('calculates age when a complete date is entered', () => {
    const { result } = renderHook(() => useDateInput());

    changeValue(result, '01/01/1990');

    const expectedAge = new Date().getFullYear() - 1990;
    expect(result.current.age).toBe(expectedAge.toString());
  });

  it('returns empty age when date is incomplete', () => {
    const { result } = renderHook(() => useDateInput());

    changeValue(result, '25/10');

    expect(result.current.value).toBe('25/10');
    expect(result.current.age).toBe('');
  });

  it('caps input at 8 digits', () => {
    const { result } = renderHook(() => useDateInput());

    changeValue(result, '251019901234');

    expect(result.current.value).toBe('25/10/1990');
  });

  it('exposes setValue to allow direct assignment', () => {
    const { result } = renderHook(() => useDateInput());

    act(() => {
      result.current.setValue('01/01/2000');
    });

    expect(result.current.value).toBe('01/01/2000');
  });
});
