import { create } from 'zustand';
import type { UserProfile } from '../types/users.types';
import { usersService } from '../services/users.service';
import { useAuthStore } from './useAuthStore';

interface UsersState {
  students: UserProfile[];
  teachers: UserProfile[];
  loading: boolean;
  error: string | null;
  fetchStudents: () => Promise<void>;
  fetchTeachers: () => Promise<void>;
  createUser: (payload: {
    email: string;
    full_name: string;
    role: 'student' | 'teacher';
    password: string;
    studio_id: string;
  }) => Promise<void>;
  deleteUser: (id: string, role: 'student' | 'teacher') => Promise<void>;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  students: [],
  teachers: [],
  loading: false,
  error: null,

  fetchStudents: async () => {
    const studioId = useAuthStore.getState().current_studio_id;
    if (!studioId) {
      set({ error: 'No active studio', loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const data = await usersService.getStudents(studioId);
      set({ students: data, loading: false });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Error desconocido', loading: false });
    }
  },

  fetchTeachers: async () => {
    const studioId = useAuthStore.getState().current_studio_id;
    if (!studioId) {
      set({ error: 'No active studio', loading: false });
      return;
    }
    set({ loading: true, error: null });
    try {
      const data = await usersService.getTeachers(studioId);
      set({ teachers: data, loading: false });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Error desconocido', loading: false });
    }
  },

  createUser: async (payload) => {
    set({ loading: true, error: null });
    try {
      await usersService.createUser(payload);
      if (payload.role === 'student') await get().fetchStudents();
      if (payload.role === 'teacher') await get().fetchTeachers();
      set({ loading: false });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Error desconocido', loading: false });
      throw err;
    }
  },

  deleteUser: async (id, role) => {
    set({ loading: true, error: null });
    try {
      await usersService.deleteUser(id);
      if (role === 'student') await get().fetchStudents();
      if (role === 'teacher') await get().fetchTeachers();
      set({ loading: false });
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Error desconocido', loading: false });
      throw err;
    }
  }
}));
