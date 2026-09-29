import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEnrolledStudentsRemoval } from './useEnrolledStudentsRemoval';

const mockCancelEnrollment = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockOnStudentRemoved = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  classesService: {
    cancelEnrollment: mockCancelEnrollment,
  },
}));

vi.mock('@/ui/useAlert', () => ({
  useAlert: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

describe('useEnrolledStudentsRemoval', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCancelEnrollment.mockResolvedValue(undefined);
  });

  it('confirms removal through the service and notifies on success', async () => {
    const { result } = renderHook(() => useEnrolledStudentsRemoval(mockOnStudentRemoved));

    act(() => {
      result.current.requestRemove('enroll-1');
    });
    expect(result.current.studentToCancel).toBe('enroll-1');

    await act(async () => {
      await result.current.confirmRemove();
    });

    expect(mockCancelEnrollment).toHaveBeenCalledWith('enroll-1');
    expect(mockShowSuccess).toHaveBeenCalledWith('Alumno dado de baja correctamente.');
    expect(mockOnStudentRemoved).toHaveBeenCalled();
    expect(result.current.studentToCancel).toBeNull();
    expect(result.current.removingId).toBeNull();
  });

  it('shows an error and skips the refresh callback when the service rejects', async () => {
    mockCancelEnrollment.mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useEnrolledStudentsRemoval(mockOnStudentRemoved));

    act(() => {
      result.current.requestRemove('enroll-2');
    });

    await act(async () => {
      await result.current.confirmRemove();
    });

    expect(mockCancelEnrollment).toHaveBeenCalledWith('enroll-2');
    expect(mockShowError).toHaveBeenCalledWith('No se pudo dar de baja al alumno.');
    expect(mockShowSuccess).not.toHaveBeenCalled();
    expect(mockOnStudentRemoved).not.toHaveBeenCalled();
    expect(result.current.studentToCancel).toBeNull();
    expect(result.current.removingId).toBeNull();
  });

  it('cancels the pending removal without calling the service', () => {
    const { result } = renderHook(() => useEnrolledStudentsRemoval(mockOnStudentRemoved));

    act(() => {
      result.current.requestRemove('enroll-3');
    });
    act(() => {
      result.current.cancelRemove();
    });

    expect(result.current.studentToCancel).toBeNull();
    expect(mockCancelEnrollment).not.toHaveBeenCalled();
  });

  it('does nothing when confirming without a pending removal', async () => {
    const { result } = renderHook(() => useEnrolledStudentsRemoval());

    await act(async () => {
      await result.current.confirmRemove();
    });

    expect(mockCancelEnrollment).not.toHaveBeenCalled();
    expect(mockShowSuccess).not.toHaveBeenCalled();
    expect(mockShowError).not.toHaveBeenCalled();
  });
});
