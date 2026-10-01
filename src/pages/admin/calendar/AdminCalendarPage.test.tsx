import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { UseAdminCalendarDataResult } from '@/core/hooks/admin/useAdminCalendarData';
import type { ClassEntity, EnrollmentEntity } from '@/core/types/classes.types';
import type { Holiday } from '@/core/types/holiday.types';
import { AdminCalendarPage } from './AdminCalendarPage';

// --- Hoisted mocks ---

const mockUseAdminCalendarData = vi.hoisted(() => vi.fn());
const mockUseHolidays = vi.hoisted(() => vi.fn());
const mockOpenStudentsModal = vi.hoisted(() => vi.fn());
const mockCloseStudentsModal = vi.hoisted(() => vi.fn());
const mockRefetch = vi.hoisted(() => vi.fn());
const mockGetClasses = vi.hoisted(() => vi.fn());
const mockGetEnrolledStudents = vi.hoisted(() => vi.fn());
const mockCancelEnrollment = vi.hoisted(() => vi.fn());

vi.mock('@/core/hooks/admin/useAdminCalendarData', () => ({
  useAdminCalendarData: mockUseAdminCalendarData,
}));

// The real `getHolidayForDate` is pure and stays in place; only the fetching
// hook is faked so the page never reaches HolidayService.
vi.mock('@/core/hooks/shared/useHolidays', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/hooks/shared/useHolidays')>();
  return { ...actual, useHolidays: mockUseHolidays };
});

// The page must not need the services layer: mocking it (this is what
// EnrolledStudentsModal -> useEnrolledStudentsRemoval transitively imports)
// proves the page still works when the service clients are replaced, and the
// spies prove the page never reaches them by itself.
vi.mock('@/core/services', () => ({
  classesService: {
    getClasses: mockGetClasses,
    getEnrolledStudents: mockGetEnrolledStudents,
    cancelEnrollment: mockCancelEnrollment,
  },
}));

vi.mock('@/ui/useAlert', () => ({
  useAlert: () => ({ showAlert: vi.fn(), showError: vi.fn(), showSuccess: vi.fn() }),
}));

vi.mock('@/core/store/useAuthStore', () => ({
  useAuthStore: () => ({ current_studio_id: 'studio-test' }),
}));

// --- Test fixtures ---

const STUDIO_ID = 'studio-test';
// Wednesday 2026-03-18, local noon: selected-day behavior stays deterministic.
const FIXED_NOW = new Date(2026, 2, 18, 12, 0, 0);
const WEDNESDAY = FIXED_NOW.getDay();
const RESERVATION_DATE = '2026-03-18';

const WEDNESDAY_CLASS: ClassEntity = {
  id: 'class-wed',
  activity_name: 'Funcional',
  teacher_id: 'teacher-1',
  day_of_week: WEDNESDAY,
  start_time: '19:00:00',
  end_time: '20:00:00',
  capacity: 20,
  base_price: 0,
  teacher_commission_pct: 0,
  is_active: true,
};

const OTHER_DAY_CLASS: ClassEntity = {
  ...WEDNESDAY_CLASS,
  id: 'class-other',
  activity_name: 'Yoga',
  day_of_week: (WEDNESDAY + 1) % 7,
};

const STUDENTS: EnrollmentEntity[] = [
  {
    id: 'enrollment-1',
    class_id: WEDNESDAY_CLASS.id,
    student_id: 'student-1',
    reservation_date: RESERVATION_DATE,
    attendance_status: 'pending',
    profiles: { id: 'student-1', full_name: 'Sofía Alumna' },
  },
];

const WEDNESDAY_HOLIDAY: Holiday = {
  id: 'holiday-1',
  motivo: 'Feriado de prueba',
  tipo: 'inamovible',
  dia: 18,
  mes: 3,
  id_info: 'Feriado de prueba',
};

const defaultData: UseAdminCalendarDataResult = {
  classes: [],
  loading: false,
  refetch: mockRefetch,
  viewingStudentsClass: null,
  students: [],
  loadingStudents: false,
  openStudentsModal: mockOpenStudentsModal,
  closeStudentsModal: mockCloseStudentsModal,
};

// Every element that used to carry an inline style in the page.
const EXTRACTED_STYLE_SELECTORS = [
  '.calendar-legend',
  '.legend-item',
  '.schedule-toggle-arrow',
  '.schedule-card-body',
  '.schedule-class-row',
  '.schedule-class-info',
  '.schedule-class-name',
  '.schedule-class-teacher',
  '.schedule-class-times',
  '.schedule-class-time',
  '.schedule-class-capacity',
];

// --- Test utilities ---

function setupData(overrides: Partial<UseAdminCalendarDataResult> = {}) {
  mockUseAdminCalendarData.mockReturnValue({ ...defaultData, ...overrides });
}

function setupHolidays(markedDates: Record<string, Holiday> = {}) {
  mockUseHolidays.mockReturnValue({
    holidays: Object.values(markedDates),
    markedDates,
    loadingHolidays: false,
  });
}

function renderPage() {
  return render(<AdminCalendarPage />);
}

function expandDay() {
  fireEvent.click(screen.getByText('1 Clases'));
}

function expectNoInlineStyles(container: HTMLElement, selectors: string[]) {
  expect(selectors.length).toBeGreaterThan(0);
  selectors.forEach((selector) => {
    const elements = Array.from(container.querySelectorAll(selector));
    expect(elements.length).toBeGreaterThan(0);
    elements.forEach((element) => expect(element).not.toHaveAttribute('style'));
  });
}

function getModalCloseButton(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector<HTMLButtonElement>('.modal-header .action-btn');
  if (!button) throw new Error('No se encontró el botón de cierre del modal');
  return button;
}

describe('AdminCalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
    setupHolidays();
    mockOpenStudentsModal.mockResolvedValue(undefined);
    mockRefetch.mockResolvedValue(undefined);
    setupData();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pide los datos al hook con el studio activo', () => {
    renderPage();

    expect(mockUseAdminCalendarData).toHaveBeenCalledWith(STUDIO_ID);
  });

  it('muestra el Loader de agenda mientras loading es true', () => {
    setupData({ loading: true });

    const { container } = renderPage();

    expect(screen.getByText('Cargando agenda...')).toBeInTheDocument();
    expect(screen.queryByText('No hay clases programadas para este día.')).not.toBeInTheDocument();
    expectNoInlineStyles(container, ['.calendar-schedule-loader']);
  });

  it('renderiza las clases que aporta el hook cuando loading es false', () => {
    setupData({ classes: [WEDNESDAY_CLASS, OTHER_DAY_CLASS] });

    const { container } = renderPage();

    expect(screen.queryByText('Cargando agenda...')).not.toBeInTheDocument();
    // Day count derives from the hook classes filtered by the selected day.
    expect(screen.getByText('1 Clases')).toBeInTheDocument();
    expect(screen.queryByText('Funcional')).not.toBeInTheDocument();

    expandDay();

    expect(screen.getByText('Funcional')).toBeInTheDocument();
    expect(screen.getByText('Prof: Sin Asignar')).toBeInTheDocument();
    expect(screen.getByText('Anotados: 0 / 20')).toBeInTheDocument();
    // The class scheduled on another weekday is not part of the selected day.
    expect(screen.queryByText('Yoga')).not.toBeInTheDocument();
    expectNoInlineStyles(container, EXTRACTED_STYLE_SELECTORS);
  });

  it('delega la apertura del modal de alumnos con la fecha del día seleccionado', () => {
    setupData({ classes: [WEDNESDAY_CLASS] });

    const { container } = renderPage();

    expandDay();
    fireEvent.click(screen.getByText('Funcional'));

    expect(mockOpenStudentsModal).toHaveBeenCalledTimes(1);
    expect(mockOpenStudentsModal).toHaveBeenCalledWith(WEDNESDAY_CLASS, RESERVATION_DATE);
    expect(container.querySelector('.modal-header')).toBeNull();
  });

  it('muestra el modal con los alumnos que aporta el hook y delega su cierre', () => {
    setupData({ viewingStudentsClass: WEDNESDAY_CLASS, students: STUDENTS });

    const { container } = renderPage();

    expect(screen.getByText('Funcional - Alumnos')).toBeInTheDocument();
    expect(screen.getByText('Sofía Alumna')).toBeInTheDocument();
    expect(screen.queryByText('No hay alumnos inscriptos.')).not.toBeInTheDocument();

    fireEvent.click(getModalCloseButton(container));

    expect(mockCloseStudentsModal).toHaveBeenCalledTimes(1);
  });

  it('marca el feriado con la clase holiday-dot, sin estilos inline', () => {
    setupHolidays({ [RESERVATION_DATE]: WEDNESDAY_HOLIDAY });

    const { container } = renderPage();

    const dot = container.querySelector('.holiday-dot');

    expect(screen.getByText(/Feriado de prueba/)).toBeInTheDocument();
    expect(dot).not.toBeNull();
    expect(dot).toHaveAttribute('title', 'Feriado de prueba');
    expect(dot).not.toHaveAttribute('style');
  });

  it('no consulta la capa de servicios por su cuenta: los datos llegan por el hook', () => {
    setupData({ classes: [WEDNESDAY_CLASS] });

    renderPage();

    expandDay();
    fireEvent.click(screen.getByText('Funcional'));

    expect(mockGetClasses).not.toHaveBeenCalled();
    expect(mockGetEnrolledStudents).not.toHaveBeenCalled();
    expect(mockCancelEnrollment).not.toHaveBeenCalled();
  });
});
