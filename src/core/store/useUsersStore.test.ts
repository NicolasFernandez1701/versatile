import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useUsersStore } from './useUsersStore';

const { mockGetStudents, mockGetTeachers, mockCreateUser, mockDeleteUser } = vi.hoisted(() => ({
  mockGetStudents: vi.fn(),
  mockGetTeachers: vi.fn(),
  mockCreateUser: vi.fn(),
  mockDeleteUser: vi.fn(),
}));

vi.mock('../services/users.service', () => ({
  usersService: {
    getStudents: mockGetStudents,
    getTeachers: mockGetTeachers,
    createUser: mockCreateUser,
    deleteUser: mockDeleteUser,
  },
}));

describe('useUsersStore', () => {
  beforeEach(() => {
    useUsersStore.setState({
      students: [],
      teachers: [],
      loading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────
  // fetchStudents
  // ────────────────────────────────────────────
  describe('fetchStudents', () => {
    it('debería cargar alumnos y actualizar el estado', async () => {
      const mockData = [{ id: '1', full_name: 'Alumno', role: 'student' }];
      mockGetStudents.mockResolvedValue(mockData);

      await useUsersStore.getState().fetchStudents();

      const state = useUsersStore.getState();
      expect(state.students).toEqual(mockData);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('debería manejar errores', async () => {
      mockGetStudents.mockRejectedValue(new Error('Error al obtener alumnos'));

      await useUsersStore.getState().fetchStudents();

      const state = useUsersStore.getState();
      expect(state.error).toBe('Error al obtener alumnos');
      expect(state.loading).toBe(false);
      expect(state.students).toEqual([]);
    });

    it('debería mostrar loading mientras se ejecuta', async () => {
      let resolvePromise: Function;
      mockGetStudents.mockReturnValue(new Promise((r) => (resolvePromise = r)));

      const promise = useUsersStore.getState().fetchStudents();

      expect(useUsersStore.getState().loading).toBe(true);

      resolvePromise!([{ id: '1', full_name: 'Test', role: 'student' }]);
      await promise;

      expect(useUsersStore.getState().loading).toBe(false);
    });
  });

  // ────────────────────────────────────────────
  // fetchTeachers
  // ────────────────────────────────────────────
  describe('fetchTeachers', () => {
    it('debería cargar profesores y actualizar el estado', async () => {
      const mockData = [{ id: '2', full_name: 'Profe', role: 'teacher' }];
      mockGetTeachers.mockResolvedValue(mockData);

      await useUsersStore.getState().fetchTeachers();

      const state = useUsersStore.getState();
      expect(state.teachers).toEqual(mockData);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('debería manejar errores', async () => {
      mockGetTeachers.mockRejectedValue(new Error('Error al obtener profesores'));

      await useUsersStore.getState().fetchTeachers();

      expect(useUsersStore.getState().error).toBe('Error al obtener profesores');
      expect(useUsersStore.getState().loading).toBe(false);
    });
  });

  // ────────────────────────────────────────────
  // createUser
  // ────────────────────────────────────────────
  describe('createUser', () => {
    it('debería crear alumno y recargar lista de alumnos', async () => {
      mockCreateUser.mockResolvedValue(undefined);
      mockGetStudents.mockResolvedValue([{ id: 'new', full_name: 'Nuevo', role: 'student' }]);

      await useUsersStore.getState().createUser({
        email: 'nuevo@test.com',
        full_name: 'Nuevo',
        role: 'student',
      });

      expect(mockCreateUser).toHaveBeenCalled();
      expect(mockGetStudents).toHaveBeenCalled();
      expect(useUsersStore.getState().students).toHaveLength(1);
      expect(useUsersStore.getState().loading).toBe(false);
    });

    it('debería crear profesor y recargar lista de profesores', async () => {
      mockCreateUser.mockResolvedValue(undefined);
      mockGetTeachers.mockResolvedValue([{ id: 'new', full_name: 'Nuevo Profe', role: 'teacher' }]);

      await useUsersStore.getState().createUser({
        email: 'profe@test.com',
        full_name: 'Nuevo Profe',
        role: 'teacher',
      });

      expect(mockGetTeachers).toHaveBeenCalled();
      expect(useUsersStore.getState().teachers).toHaveLength(1);
    });

    it('debería manejar errores y relanzar', async () => {
      mockCreateUser.mockRejectedValue(new Error('Error al crear'));

      await expect(
        useUsersStore.getState().createUser({
          email: 'test@test.com',
          full_name: 'Test',
          role: 'student',
        }),
      ).rejects.toThrow('Error al crear');

      expect(useUsersStore.getState().error).toBe('Error al crear');
      expect(useUsersStore.getState().loading).toBe(false);
    });
  });

  // ────────────────────────────────────────────
  // deleteUser
  // ────────────────────────────────────────────
  describe('deleteUser', () => {
    it('debería eliminar alumno y recargar lista', async () => {
      mockDeleteUser.mockResolvedValue(undefined);
      mockGetStudents.mockResolvedValue([]);

      await useUsersStore.getState().deleteUser('1', 'student');

      expect(mockDeleteUser).toHaveBeenCalledWith('1');
      expect(mockGetStudents).toHaveBeenCalled();
    });

    it('debería eliminar profesor y recargar lista', async () => {
      mockDeleteUser.mockResolvedValue(undefined);
      mockGetTeachers.mockResolvedValue([]);

      await useUsersStore.getState().deleteUser('2', 'teacher');

      expect(mockDeleteUser).toHaveBeenCalledWith('2');
      expect(mockGetTeachers).toHaveBeenCalled();
    });

    it('debería manejar errores y relanzar', async () => {
      mockDeleteUser.mockRejectedValue(new Error('Error al eliminar'));

      await expect(
        useUsersStore.getState().deleteUser('1', 'student'),
      ).rejects.toThrow('Error al eliminar');

      expect(useUsersStore.getState().error).toBe('Error al eliminar');
      expect(useUsersStore.getState().loading).toBe(false);
    });
  });
});
