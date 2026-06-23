import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminDashboard } from './AdminDashboard';

// --- Hoisted mocks ---

const mockNavigate = vi.hoisted(() => vi.fn());

const mockGetDashboardStats = vi.hoisted(() => vi.fn());
const mockGetFinancialBalance = vi.hoisted(() => vi.fn());
const mockGetTodayClasses = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/core/services', () => ({
  dashboardService: {
    getDashboardStats: mockGetDashboardStats,
    getFinancialBalance: mockGetFinancialBalance,
    getTodayClasses: mockGetTodayClasses,
  },
}));

// --- Test utilities ---

function renderDashboard() {
  return render(
    <BrowserRouter>
      <AdminDashboard />
    </BrowserRouter>,
  );
}

const defaultStats = { totalStudents: 150, activeClasses: 12 };
const defaultBalance = {
  monthlyTotal: 50000,
  annualTotal: 600000,
  monthlyByPlan: {},
  annualByPlan: {},
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDashboardStats.mockResolvedValue(defaultStats);
    mockGetFinancialBalance.mockResolvedValue(defaultBalance);
    mockGetTodayClasses.mockResolvedValue([]);
  });

  // ── test 1: loader while fetching data ──

  it('muestra el Loader mientras se cargan los datos', () => {
    const never = () => new Promise<never>(() => {});
    mockGetDashboardStats.mockImplementation(never);
    mockGetFinancialBalance.mockImplementation(never);
    mockGetTodayClasses.mockImplementation(never);

    renderDashboard();

    expect(screen.getByText('Cargando métricas...')).toBeInTheDocument();
  });

  // ── test 2: full dashboard renders ──

  it('renderiza el dashboard completo con estadísticas y balance', async () => {
    renderDashboard();

    expect(await screen.findByText('Vista General')).toBeInTheDocument();
    expect(screen.getByText('Ingresos del Mes')).toBeInTheDocument();
    expect(screen.getByText('Ingresos del Año')).toBeInTheDocument();
    expect(screen.getByText('Alumnos Activos')).toBeInTheDocument();
    expect(screen.getByText('Clases Activas')).toBeInTheDocument();
    expect(screen.getByText('Clases de Hoy')).toBeInTheDocument();
    expect(screen.getByText('No hay clases programadas para hoy.')).toBeInTheDocument();
  });

  // ── test 3: summary card values ──

  it('renderiza los SummaryCards con los valores correctos', async () => {
    mockGetDashboardStats.mockResolvedValue({ totalStudents: 88, activeClasses: 15 });
    mockGetFinancialBalance.mockResolvedValue({
      ...defaultBalance,
      monthlyTotal: 25000,
      annualTotal: 300000,
    });

    renderDashboard();

    expect(await screen.findByText('88')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  // ── test 4: clicking a SummaryCard navigates ──

  it('navega al hacer click en un SummaryCard', async () => {
    renderDashboard();

    expect(await screen.findByText('Alumnos Activos')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Alumnos Activos'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/students');

    fireEvent.click(screen.getByText('Clases Activas'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/classes');

    fireEvent.click(screen.getByText('Ingresos del Mes'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/finances');

    expect(mockNavigate).toHaveBeenCalledTimes(3);
  });

  // ── test 5: today's classes list ──

  it('muestra las clases de hoy cuando existen', async () => {
    const mockClasses = [
      {
        id: '1',
        activity_name: 'Yoga',
        profiles: { full_name: 'Ana García' },
        start_time: '09:00:00',
        end_time: '10:00:00',
      },
      {
        id: '2',
        activity_name: 'Spinning',
        profiles: { full_name: 'Carlos López' },
        start_time: '10:00:00',
        end_time: '11:00:00',
      },
    ];
    mockGetTodayClasses.mockResolvedValue(mockClasses as any);

    renderDashboard();

    expect(await screen.findByText('Yoga')).toBeInTheDocument();
    expect(screen.getByText('Spinning')).toBeInTheDocument();
    expect(screen.getByText('Prof: Ana García')).toBeInTheDocument();
    expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
    expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
    expect(screen.queryByText('No hay clases programadas para hoy.')).not.toBeInTheDocument();
  });

  // ── test 6: empty today's classes ──

  it('muestra "No hay clases programadas para hoy" cuando no hay clases', async () => {
    mockGetTodayClasses.mockResolvedValue([]);

    renderDashboard();

    expect(await screen.findByText('No hay clases programadas para hoy.')).toBeInTheDocument();
  });

  // ── test 7: error handling ──

  it('maneja errores de carga silenciosamente sin mostrar error en UI', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockGetDashboardStats.mockRejectedValue(new Error('Network error'));
    mockGetFinancialBalance.mockRejectedValue(new Error('Network error'));
    mockGetTodayClasses.mockRejectedValue(new Error('Network error'));

    renderDashboard();

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error cargando el dashboard:',
        expect.any(Error),
      );
    });

    // Component stays showing loader because stats/balance are null
    expect(screen.getByText('Cargando métricas...')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  // ── test 8: quick actions (hide-on-desktop) ──

  it('renderiza las acciones rápidas en la sección hide-on-desktop', async () => {
    renderDashboard();

    expect(await screen.findByText('Acciones Rápidas')).toBeInTheDocument();
    expect(screen.getByText('Matrículas')).toBeInTheDocument();
    expect(screen.getByText('Grilla')).toBeInTheDocument();
    expect(screen.getByText('Finanzas')).toBeInTheDocument();
    expect(screen.getByText('Alumnos')).toBeInTheDocument();
    expect(screen.getByText('Profesores')).toBeInTheDocument();
    expect(screen.getByText('Planes')).toBeInTheDocument();

    // Verify navigation from quick actions
    fireEvent.click(screen.getByText('Planes'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/plans');

    fireEvent.click(screen.getByText('Grilla'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/calendar');

    fireEvent.click(screen.getByText('Matrículas'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/enrollments');

    fireEvent.click(screen.getByText('Profesores'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/teachers');
  });
});
