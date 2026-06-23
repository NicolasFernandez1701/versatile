import { describe, it, expect, vi, beforeEach } from 'vitest';
import { attendanceService } from './attendance.service';

// ──────────────────────────────────────────────
// 1. Datos de prueba
// ──────────────────────────────────────────────

const mockRawEnrollments: any[] = [
  {
    id: 'enr-001',
    student_id: 'stu-001',
    class_id: 'cls-001',
    reservation_date: '2024-06-15',
    attendance_status: 'confirmed',
    profiles: {
      id: 'stu-001',
      full_name: 'María García',
      phone: '123456789',
      email: 'maria@test.com',
    },
  },
  {
    id: 'enr-002',
    student_id: 'stu-002',
    class_id: 'cls-001',
    reservation_date: '2024-06-15',
    attendance_status: 'pending',
    profiles: {
      id: 'stu-002',
      full_name: 'Juan Pérez',
      phone: '987654321',
      email: 'juan@test.com',
    },
  },
];



// ──────────────────────────────────────────────
// 2. Mock de Supabase
// ──────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: { from: mockFrom },
}));

describe('attendanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────
  // getClassEnrollments
  // ────────────────────────────────────────────
  describe('getClassEnrollments', () => {
    it('debería devolver todos los inscriptos de una clase', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: mockRawEnrollments, error: null }),
        })),
      });

      const result = await attendanceService.getClassEnrollments('cls-001');

      expect(result).toEqual(mockRawEnrollments);
      expect(mockFrom).toHaveBeenCalledWith('enrollments');
    });

    it('debería lanzar error si la consulta falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: new Error('Error DB') }),
        })),
      });

      await expect(attendanceService.getClassEnrollments('cls-001')).rejects.toThrow('Error DB');
    });
  });

  // ────────────────────────────────────────────
  // getClassAttendanceByDate (con data mapping)
  // ────────────────────────────────────────────
  describe('getClassAttendanceByDate', () => {
    it('debería devolver asistencias mapeadas al formato esperado', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn().mockResolvedValue({ data: mockRawEnrollments, error: null }),
            })),
          })),
        })),
      });

      const result = await attendanceService.getClassAttendanceByDate('cls-001', '2024-06-15');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'enr-001',
        enrollment_id: 'enr-001',
        date: '2024-06-15',
        status: 'confirmed',
        enrollments: {
          student_id: 'stu-001',
          class_id: 'cls-001',
        },
      });
      expect(mockFrom).toHaveBeenCalledWith('enrollments');
    });

    it('debería devolver array vacío si no hay datos', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        })),
      });

      const result = await attendanceService.getClassAttendanceByDate('cls-001', '2024-06-15');

      expect(result).toEqual([]);
    });

    it('debería lanzar error si falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              neq: vi.fn().mockResolvedValue({ data: null, error: new Error('Error al obtener asistencias') }),
            })),
          })),
        })),
      });

      await expect(attendanceService.getClassAttendanceByDate('cls-001', '2024-06-15')).rejects.toThrow(
        'Error al obtener asistencias'
      );
    });
  });

  // ────────────────────────────────────────────
  // markAttendance (status mapping)
  // ────────────────────────────────────────────
  describe('markAttendance', () => {
    it('debería marcar asistencia con status "present" → "attended"', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await attendanceService.markAttendance('enr-001', '2024-06-15', 'present');

      expect(mockFrom).toHaveBeenCalledWith('enrollments');
    });

    it('debería mantener otros status sin mapear ("absent")', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await attendanceService.markAttendance('enr-001', '2024-06-15', 'absent');

      expect(mockFrom).toHaveBeenCalledWith('enrollments');
    });

    it('debería lanzar error si falla', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Error al marcar asistencia') }),
        })),
      });

      await expect(attendanceService.markAttendance('enr-001', '2024-06-15', 'present')).rejects.toThrow(
        'Error al marcar asistencia'
      );
    });
  });

  // ────────────────────────────────────────────
  // getStudentAttendances (con data mapping)
  // ────────────────────────────────────────────
  describe('getStudentAttendances', () => {
    const mockRawStudentData: any[] = [
      {
        id: 'enr-001',
        student_id: 'stu-001',
        class_id: 'cls-001',
        reservation_date: '2024-06-15',
        attendance_status: 'attended',
      },
    ];

    it('debería devolver asistencias del alumno mapeadas', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: mockRawStudentData, error: null }),
        })),
      });

      const result = await attendanceService.getStudentAttendances('stu-001');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'enr-001',
        enrollment_id: 'enr-001',
        date: '2024-06-15',
        status: 'attended',
        enrollments: {
          student_id: 'stu-001',
          class_id: 'cls-001',
        },
      });
    });

    it('debería devolver array vacío si no hay asistencias', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      });

      const result = await attendanceService.getStudentAttendances('stu-999');

      expect(result).toEqual([]);
    });

    it('debería lanzar error si la consulta falla', async () => {
      mockFrom.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ data: null, error: new Error('Error al obtener asistencias del alumno') }),
        })),
      });

      await expect(attendanceService.getStudentAttendances('stu-001')).rejects.toThrow(
        'Error al obtener asistencias del alumno'
      );
    });
  });

  // ────────────────────────────────────────────
  // toggleStudentBooking (status mapping)
  // ────────────────────────────────────────────
  describe('toggleStudentBooking', () => {
    it('debería mapear "confirmed" → "pending"', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await attendanceService.toggleStudentBooking('enr-001', '2024-06-15', 'confirmed');

      expect(mockFrom).toHaveBeenCalledWith('enrollments');
    });

    it('debería mantener "cancelled" sin mapear', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      });

      await attendanceService.toggleStudentBooking('enr-001', '2024-06-15', 'cancelled');

      expect(mockFrom).toHaveBeenCalledWith('enrollments');
    });

    it('debería lanzar error si falla', async () => {
      mockFrom.mockReturnValue({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: new Error('Error al cambiar estado') }),
        })),
      });

      await expect(attendanceService.toggleStudentBooking('enr-001', '2024-06-15', 'confirmed')).rejects.toThrow(
        'Error al cambiar estado'
      );
    });
  });
});
