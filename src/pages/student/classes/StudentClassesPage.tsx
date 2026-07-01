import { useState, useEffect } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { classesService, attendanceService, enrollmentsService, dashboardService } from '@/core/services';
import type { AttendanceRecord } from '@/core/services/attendance.service';
import { Loader, Button } from '@/components/ui';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import { validateBookingWindow } from '@/core/utils/validation';
import type { ClassEntity } from '@/core/types/classes.types';
import type { StudentClassLimit } from '@/core/types/dashboard.types';

const DAYS_MAP: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado'
};

export function StudentClassesPage() {
  const { user, current_studio_id } = useAuthStore();
  const { showSuccess, showError } = useAlert();

  const [loading, setLoading] = useState(true);
  const [classesList, setClassesList] = useState<ClassEntity[]>([]);
  const [reservations, setReservations] = useState<AttendanceRecord[]>([]);
  const [planLimits, setPlanLimits] = useState<StudentClassLimit>({ limit: 0, classesPerWeek: 0, perActivity: {} });

  // Para simular la semana actual y las fechas de las clases
  const [weekDates, setWeekDates] = useState<Record<number, Date>>({});

  useEffect(() => {
    // Generar fechas de la semana actual (Lunes a Domingo)
    const curr = new Date();
    const first = curr.getDate() - curr.getDay() + 1; // Lunes
    const dates: Record<number, Date> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(curr.setDate(first + i));
      const dayOfWeek = d.getDay(); // 0-6
      dates[dayOfWeek] = d;
    }
    setWeekDates(dates);
  }, []);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);

      // Traer TODAS las clases del gimnasio
      const cData = await classesService.getClasses(current_studio_id || '');
      setClassesList(cData.filter((c) => c.is_active !== false));

      // Traer las reservas del alumno
      const resData = await attendanceService.getStudentAttendances(user.id);
      setReservations(resData);

      // Traer límite mensual del plan con desglose por actividad
      const classLimit = await dashboardService.getStudentClassLimit(user.id);
      setPlanLimits(classLimit);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      showError('Error cargando los datos: ' + message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Object.keys(weekDates).length > 0) {
      loadData();
    }
  }, [user?.id, weekDates]);

  const handleBooking = async (
    classId: string,
    classDate: Date,
    action: 'enroll' | 'cancel',
    startTime: string,
    activityName?: string,
    existingReservationId?: string
  ) => {
    try {
      // Validar ventana de tiempo mínima (1 hora antes de la clase)
      const window = validateBookingWindow(startTime, classDate);
      if (!window.allowed) {
        showError(window.reason!);
        return;
      }

      const dateStr = classDate.toISOString().split('T')[0];

      if (action === 'enroll') {
        // Check per-activity quota
        if (activityName) {
          const activityQuota = planLimits.perActivity[activityName];
          if (activityQuota && activityQuota.remaining <= 0) {
            showError(`No tenés cupos disponibles para ${activityName} este mes.`);
            return;
          }
        }

        // Fallback total check for activities not in perActivity map
        const totalConsumed = Object.values(planLimits.perActivity).reduce((sum, q) => sum + q.consumed, 0);
        if (totalConsumed >= planLimits.limit && planLimits.limit > 0) {
          showError(`Alcanzaste tu límite mensual de ${planLimits.limit} clases.`);
          return;
        }

        await enrollmentsService.enrollStudent(user!.id, classId, dateStr);
        showSuccess('¡Lugar reservado con éxito!');
      } else if (action === 'cancel' && existingReservationId) {
        await enrollmentsService.unenrollStudent(existingReservationId);
        showSuccess('Reserva cancelada. Cupo liberado.');
      }

      loadData(); // Recargar datos para reflejar estado real
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      showError('Error al procesar reserva: ' + message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Loader />
      </div>
    );
  }

  // Agrupar clases por día de la semana
  const classesByDay: Record<number, ClassEntity[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
    0: []
  };
  classesList.forEach((cls) => {
    if (classesByDay[cls.day_of_week]) {
      classesByDay[cls.day_of_week].push(cls);
    }
  });

  return (
    <div
      className="page-container"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}
    >
      <div className="page-header" style={{ marginBottom: 0, flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1>Reservar Clases</h1>
          <p className="text-secondary">Explorá la grilla semanal y reservá tus lugares.</p>
        </div>
        <div
          style={{
            background: 'var(--primary-color)',
            color: 'white',
            padding: '0.75rem 1.25rem',
            borderRadius: '12px',
            fontWeight: 600,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.25rem',
            width: '100%',
            maxWidth: '280px'
          }}
        >
          {Object.keys(planLimits.perActivity).length > 0 ? (
            Object.entries(planLimits.perActivity).map(([_, quota]) => (
              <div key={quota.activity_name} style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem' }}>
                <span>{quota.activity_name}</span>
                <span style={{ opacity: 0.9 }}>{quota.consumed} / {quota.total}</span>
              </div>
            ))
          ) : (
            <span>Créditos Mensuales: {Object.values(planLimits.perActivity).reduce((sum, q) => sum + q.consumed, 0)} / {planLimits.limit}</span>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '2rem',
          flex: 1,
          alignItems: 'flex-start',
          overflowY: 'auto'
        }}
      >
        <div
          style={{
            flex: 1,
            background: 'var(--surface-color)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem'
          }}
        >
          {[1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => {
            const dayClasses = classesByDay[dayOfWeek];
            if (!dayClasses || dayClasses.length === 0) return null;

            const classDate = weekDates[dayOfWeek];
            const dateStr = classDate?.toISOString().split('T')[0];

            return (
              <div
                key={dayOfWeek}
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                <h2
                  style={{
                    fontSize: '1.2rem',
                    color: 'var(--primary-color)',
                    borderBottom: '2px solid var(--border-color)',
                    paddingBottom: '0.5rem'
                  }}
                >
                  {DAYS_MAP[dayOfWeek]} - {dateStr}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {dayClasses.map((cls) => {
                    // Buscar si el alumno ya reservó esta clase para esta fecha
                    const reservation = reservations.find(
                      (r) =>
                        r.enrollments?.class_id === cls.id &&
                        r.date === dateStr &&
                        r.status !== 'cancelled'
                    );

                    // Calcular si la clase ya pasó
                    const now = new Date();
                    const classDateTime = new Date(classDate);
                    const [hours, minutes] = cls.start_time.split(':');
                    classDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
                    const isPast = now > classDateTime;

                    return (
                      <div
                        key={cls.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '1.25rem',
                          background: 'var(--background-color)',
                          borderRadius: '12px',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        <div>
                          <h3 style={{ marginBottom: '0.25rem' }}>{cls.activity_name}</h3>
                          <p
                            className="text-secondary"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              fontSize: '0.9rem',
                              marginTop: '0.25rem'
                            }}
                          >
                            <Clock size={16} /> {cls.start_time.substring(0, 5)} hs -{' '}
                            {cls.end_time.substring(0, 5)} hs
                          </p>
                        </div>

                        <div>
                          {isPast ? (
                            <span
                              style={{
                                color: 'var(--text-secondary)',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}
                            >
                              {reservation?.status === 'present' ? (
                                <>
                                  <CheckCircle size={18} color="var(--success-color)" /> Asististe
                                </>
                              ) : reservation?.status === 'absent' ? (
                                <>
                                  <XCircle size={18} color="var(--error-color)" /> Faltaste
                                </>
                              ) : (
                                'Finalizada'
                              )}
                            </span>
                          ) : reservation ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <span
                                style={{
                                  color: 'var(--success-color)',
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem'
                                }}
                              >
                                <CheckCircle size={18} /> Reservado
                              </span>
                              <Button
                                variant="danger"
                                onClick={() =>
                                  handleBooking(
                                    cls.id,
                                    classDate,
                                    'cancel',
                                    cls.start_time,
                                    cls.activity_name,
                                    reservation.id
                                  )
                                }
                              >
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="primary"
                              onClick={() =>
                                handleBooking(cls.id, classDate, 'enroll', cls.start_time, cls.activity_name)
                              }
                              disabled={(() => {
                                const q = planLimits.perActivity[cls.activity_name];
                                const totalConsumed = Object.values(planLimits.perActivity).reduce((sum, a) => sum + a.consumed, 0);
                                return (q && q.remaining <= 0) || (totalConsumed >= planLimits.limit && planLimits.limit > 0);
                              })()}
                            >
                              Reservar Lugar
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
