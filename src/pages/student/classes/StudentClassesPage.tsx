import { useState, useEffect } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { supabase } from '@/core/services/supabase';
import { classesService, attendanceService, enrollmentsService } from '@/core/services';
import { Loader, Button } from '@/components/ui';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import type { ClassEntity } from '@/core/types/classes.types';
import '@/pages/admin/dashboard/dashboard.css';

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
  const [reservations, setReservations] = useState<any[]>([]);
  const [planLimits, setPlanLimits] = useState({ limit: 0, consumed: 0 });

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

      // Traer información del plan activo desde los pagos
      const today = new Date().toISOString().split('T')[0];
      const { data: payments } = await supabase
        .from('payments')
        .select('plan_id, plans(classes_per_week)')
        .eq('student_id', user.id)
        .gte('expiration_date', today)
        .order('expiration_date', { ascending: false })
        .limit(1);

      const activePayment = payments?.[0];
      const limit = ((activePayment?.plans as any)?.classes_per_week || 0) * 4;

      // Contar consumos del mes actual
      const now = new Date();
      const monthStr = now.toISOString().substring(0, 7); // YYYY-MM
      const consumed = resData.filter(
        (r) => r.date.startsWith(monthStr) && r.status !== 'cancelled'
      ).length;

      setPlanLimits({ limit, consumed });
    } catch (error: any) {
      showError('Error cargando los datos: ' + error.message);
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
    existingReservationId?: string
  ) => {
    try {
      // Validación estricta de tiempo simulada en front
      const now = new Date();
      const classDateTime = new Date(classDate);
      const [hours, minutes] = startTime.split(':');
      classDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      const diffMs = classDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (action === 'enroll' && diffHours < 1.0) {
        showError('No podés anotarte con menos de 1 hora de anticipación.');
        return;
      }

      if (action === 'cancel' && diffHours < 1.0) {
        showError('No podés cancelar con menos de 1 hora de anticipación.');
        return;
      }

      const dateStr = classDate.toISOString().split('T')[0];

      if (action === 'enroll') {
        if (planLimits.consumed >= planLimits.limit) {
          showError(`Alcanzaste tu límite mensual de ${planLimits.limit} clases.`);
          return;
        }
        await enrollmentsService.enrollStudent(user!.id, classId, dateStr);
        showSuccess('¡Lugar reservado con éxito!');
      } else if (action === 'cancel' && existingReservationId) {
        // En Paradigma 2, cancelar es borrar el registro (o ponerlo en cancelled)
        // Usamos unenrollStudent para liberar el cupo.
        await enrollmentsService.unenrollStudent(existingReservationId);
        showSuccess('Reserva cancelada. Cupo liberado.');
      }

      loadData(); // Recargar datos para reflejar estado real
    } catch (error: any) {
      showError('Error al procesar reserva: ' + error.message);
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
      <div className="page-header" style={{ marginBottom: 0 }}>
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
            fontWeight: 600
          }}
        >
          Créditos Mensuales: {planLimits.consumed} / {planLimits.limit}
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
                              {reservation?.status === 'attended' ? (
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
                                handleBooking(cls.id, classDate, 'enroll', cls.start_time)
                              }
                              disabled={planLimits.consumed >= planLimits.limit}
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
