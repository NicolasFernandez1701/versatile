import { useState, useCallback, useMemo } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { useUsersStore } from '@/core/store/useUsersStore';
import { useAlert } from '@/ui/GlobalAlertProvider';
import { usersService, authService } from '@/core/services';
import type { StudioMembership } from '@/core/types/auth.types';

export function canAddSelfAsTeacher(
  memberships: StudioMembership[],
  studioId: string | null,
): boolean {
  if (!studioId) return false;
  const hasAdmin = memberships.some((m) => m.studio_id === studioId && m.role === 'admin');
  const hasTeacher = memberships.some((m) => m.studio_id === studioId && m.role === 'teacher');
  return hasAdmin && !hasTeacher;
}

export function useAddSelfAsTeacher() {
  const { showSuccess, showError } = useAlert();
  const memberships = useAuthStore((state) => state.memberships);
  const current_studio_id = useAuthStore((state) => state.current_studio_id);
  const fetchTeachers = useUsersStore((state) => state.fetchTeachers);
  const [isLoading, setIsLoading] = useState(false);

  const canAdd = useMemo(
    () => canAddSelfAsTeacher(memberships, current_studio_id),
    [memberships, current_studio_id],
  );

  const addSelfAsTeacher = useCallback(async () => {
    if (!current_studio_id || isLoading) return;

    setIsLoading(true);
    try {
      await usersService.addSelfAsTeacher(current_studio_id);
      const refreshedUser = await authService.getCurrentUser();
      if (refreshedUser) {
        useAuthStore.getState().setUser(refreshedUser);
      }
      showSuccess('Ahora sos profesor de este estudio.');
      await fetchTeachers();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error al agregarte como profesor';
      showError(message);
    } finally {
      setIsLoading(false);
    }
  }, [current_studio_id, fetchTeachers, isLoading, showError, showSuccess]);

  return { canAdd, addSelfAsTeacher, isLoading };
}
