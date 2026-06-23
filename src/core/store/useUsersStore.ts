import { create } from 'zustand';
import type { UserProfile } from '../types/users.types';
import { usersService } from '../services/users.service';

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
  }) => Promise<void>;
  deleteUser: (id: string, role: 'student' | 'teacher') => Promise<void>;
}

export const useUsersStore = create<UsersState>((set, get) => ({
  students: [],
  teachers: [],
  loading: false,
  error: null,

  fetchStudents: async () => {
    set({ loading: true, error: null });
    try {
      const data = await usersService.getStudents();
      set({ students: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  fetchTeachers: async () => {
    set({ loading: true, error: null });
    try {
      const data = await usersService.getTeachers();
      set({ teachers: data, loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
    }
  },

  createUser: async (payload) => {
    set({ loading: true, error: null });
    try {
      await usersService.createUser(payload);
      if (payload.role === 'student') await get().fetchStudents();
      if (payload.role === 'teacher') await get().fetchTeachers();
      set({ loading: false });
    } catch (err: any) {
      set({ error: err.message, loading: false });
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
    } catch (err: any) {
      set({ error: err.message, loading: false });
      throw err;
    }
  }
}));
