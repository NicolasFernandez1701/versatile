import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeachersPage } from './TeachersPage';
import type { StudioMembership } from '@/core/types/auth.types';

// --- Hoisted mocks ---

const mockAddSelfAsTeacher = vi.hoisted(() => vi.fn());
const mockGetCurrentUser = vi.hoisted(() => vi.fn());
const mockFetchTeachers = vi.hoisted(() => vi.fn());
const mockShowSuccess = vi.hoisted(() => vi.fn());
const mockShowError = vi.hoisted(() => vi.fn());
const mockSetUser = vi.hoisted(() => vi.fn());
const mockUseAuthStore = vi.hoisted(() => vi.fn());
const mockUseUsersStore = vi.hoisted(() => vi.fn());

vi.mock('@/core/services', () => ({
  usersService: {
    addSelfAsTeacher: mockAddSelfAsTeacher,
    deleteUser: vi.fn(),
  },
  authService: {
    getCurrentUser: mockGetCurrentUser,
  },
}));

vi.mock('@/core/store/useAuthStore', () => ({
  useAuthStore: Object.assign(
    (selector?: (state: ReturnType<typeof mockUseAuthStore>) => unknown) => {
      const state = mockUseAuthStore();
      if (typeof selector === 'function') return selector(state);
      return state;
    },
    { getState: () => ({ setUser: mockSetUser }) },
  ),
}));

vi.mock('@/core/store/useUsersStore', () => ({
  useUsersStore: Object.assign(
    (selector?: (state: ReturnType<typeof mockUseUsersStore>) => unknown) => {
      const state = mockUseUsersStore();
      if (typeof selector === 'function') return selector(state);
      return state;
    },
    { getState: () => mockUseUsersStore() },
  ),
}));

vi.mock('@/ui/GlobalAlertProvider', () => ({
  useAlert: () => ({
    showSuccess: mockShowSuccess,
    showError: mockShowError,
  }),
}));

// --- Test utilities ---

const STUDIO_ID = 'studio-001';

function setupAuthStore(memberships: StudioMembership[]) {
  mockUseAuthStore.mockReturnValue({
    memberships,
    activeRole: memberships[0]?.role ?? null,
    current_studio_id: STUDIO_ID,
  });
}

function setupUsersStore() {
  mockUseUsersStore.mockReturnValue({
    teachers: [],
    loading: false,
    fetchTeachers: mockFetchTeachers,
  });
}

function renderPage() {
  return render(<TeachersPage />);
}

function getButton() {
  return screen.queryByRole('button', { name: /Agregarme como profesor/i });
}

describe('TeachersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddSelfAsTeacher.mockResolvedValue(undefined);
    mockGetCurrentUser.mockResolvedValue(null);
    setupUsersStore();
  });

  it('muestra el botón cuando el usuario es admin sin membresía de profesor', () => {
    setupAuthStore([{ studio_id: STUDIO_ID, studio_name: 'Studio', role: 'admin' }]);

    renderPage();

    expect(getButton()).toBeInTheDocument();
  });

  it('no muestra el botón cuando el usuario ya es admin y profesor', () => {
    setupAuthStore([
      { studio_id: STUDIO_ID, studio_name: 'Studio', role: 'admin' },
      { studio_id: STUDIO_ID, studio_name: 'Studio', role: 'teacher' },
    ]);

    renderPage();

    expect(getButton()).not.toBeInTheDocument();
  });

  it('no muestra el botón cuando el usuario no es admin', () => {
    setupAuthStore([{ studio_id: STUDIO_ID, studio_name: 'Studio', role: 'teacher' }]);

    renderPage();

    expect(getButton()).not.toBeInTheDocument();
  });

  it('no muestra el botón cuando el usuario no tiene membresías', () => {
    setupAuthStore([]);

    renderPage();

    expect(getButton()).not.toBeInTheDocument();
  });

  it('muestra el botón cuando el usuario es admin y alumno pero no profesor', () => {
    setupAuthStore([
      { studio_id: STUDIO_ID, studio_name: 'Studio', role: 'admin' },
      { studio_id: STUDIO_ID, studio_name: 'Studio', role: 'student' },
    ]);

    renderPage();

    expect(getButton()).toBeInTheDocument();
  });

  it('muestra el botón cuando el usuario es admin en el estudio actual pero profesor en otro estudio', () => {
    setupAuthStore([
      { studio_id: STUDIO_ID, studio_name: 'Studio', role: 'admin' },
      { studio_id: 'studio-002', studio_name: 'Otro Studio', role: 'teacher' },
    ]);

    renderPage();

    expect(getButton()).toBeInTheDocument();
  });

  it('llama a addSelfAsTeacher con el studio actual al hacer click', async () => {
    setupAuthStore([{ studio_id: STUDIO_ID, studio_name: 'Studio', role: 'admin' }]);

    renderPage();
    fireEvent.click(getButton()!);

    await waitFor(() => {
      expect(mockAddSelfAsTeacher).toHaveBeenCalledWith(STUDIO_ID);
    });
  });

  it('deshabilita el botón mientras la solicitud está en curso', async () => {
    let resolvePromise: () => void = () => {};
    mockAddSelfAsTeacher.mockImplementation(
      () => new Promise<void>((resolve) => { resolvePromise = resolve; })
    );

    setupAuthStore([{ studio_id: STUDIO_ID, studio_name: 'Studio', role: 'admin' }]);

    renderPage();
    const button = getButton()!;

    fireEvent.click(button);

    expect(button).toBeDisabled();

    resolvePromise();
    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it('muestra éxito, refresca la sesión y actualiza la lista de profesores cuando la solicitud es exitosa', async () => {
    const refreshedUser = { id: 'admin-user', memberships: [{ studio_id: STUDIO_ID, studio_name: 'Studio', role: 'admin' }, { studio_id: STUDIO_ID, studio_name: 'Studio', role: 'teacher' }] };
    mockGetCurrentUser.mockResolvedValue(refreshedUser);
    setupAuthStore([{ studio_id: STUDIO_ID, studio_name: 'Studio', role: 'admin' }]);

    renderPage();
    fireEvent.click(getButton()!);

    await waitFor(() => {
      expect(mockShowSuccess).toHaveBeenCalledWith('Ahora sos profesor de este estudio.');
    });
    expect(mockGetCurrentUser).toHaveBeenCalled();
    expect(mockSetUser).toHaveBeenCalledWith(refreshedUser);
    expect(mockFetchTeachers).toHaveBeenCalled();
  });

  it('muestra error cuando la solicitud falla', async () => {
    mockAddSelfAsTeacher.mockRejectedValueOnce(new Error('Ya sos profesor de este estudio'));
    setupAuthStore([{ studio_id: STUDIO_ID, studio_name: 'Studio', role: 'admin' }]);

    renderPage();
    fireEvent.click(getButton()!);

    await waitFor(() => {
      expect(mockShowError).toHaveBeenCalledWith('Ya sos profesor de este estudio');
    });
  });
});
