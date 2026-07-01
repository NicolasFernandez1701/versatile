import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { Loader, Button } from '@/components/ui';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { useStudentClassesData } from '@/core/hooks/useStudentClassesData';
import { useStudentClassesBooking } from '@/core/hooks/useStudentClassesBooking';
import type { ClassEntity } from '@/core/types/classes.types';

const DAYS_MAP: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

export function StudentClassesPage() {
  const { user } = useAuthStore();

  const [weekDates, setWeekDates] = useState<Record<number, Date>>({});

  useEffect(() => {
    const curr = new Date();
    const first = curr.getDate() - curr.getDay() + 1;
    const dates: Record<number, Date> = {};

    for (let i = 0; i < 7; i++) {
      const d = new Date(curr.setDate(first + i));
      const dayOfWeek = d.getDay();
      dates[dayOfWeek] = d;
    }

    setWeekDates(dates);
  }, []);

  const { loading, classesList, reservations, planLimits, loadData } = useStudentClassesData(weekDates);
  const { handleBooking, isActivityAvailable } = useStudentClassesBooking({
    studentId: user?.id,
    planLimits,
    refresh: loadData,
  });

  const classesByDay = useMemo<Record<number, ClassEntity[]>>(() => {
    const grouped: Record<number, ClassEntity[]> = {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      0: [],
    };

    classesList.forEach((cls) => {
      if (grouped[cls.day_of_week]) {
        grouped[cls.day_of_week].push(cls);
      }
    });

    return grouped;
  }, [classesList]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Loader />
      </div>
    );
  }

  const totalConsumed = Object.values(planLimits.perActivity).reduce((sum, q) => sum + q.consumed, 0);

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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {Object.keys(planLimits.perActivity).length > 0 ? (
            Object.entries(planLimits.perActivity).map(([_, quota]) => (
              <span
                key={quota.activity_name}
                style={{
                  background: quota.remaining > 0 ? 'var(--primary-color)' : 'var(--error-color)',
                  color: 'white',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {quota.activity_name} {quota.consumed}/{quota.total}
              </span>
            ))
          ) : (
            <span
              style={{
                background: 'var(--primary-color)',
                color: 'white',
                padding: '0.35rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              Créditos: {totalConsumed}/{planLimits.limit}
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '2rem',
          flex: 1,
          alignItems: 'flex-start',
          overflowY: 'auto',
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
            gap: '2rem',
          }}
        >
          {[1, 2, 3, 4, 5, 6, 0].map((dayOfWeek) => {
            const dayClasses = classesByDay[dayOfWeek];
            if (!dayClasses || dayClasses.length === 0) return null;

            const classDate = weekDates[dayOfWeek];
            const dateStr = classDate?.toISOString().split('T')[0];

            return (
              <div key={dayOfWeek} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h2
                  style={{
                    fontSize: '1.2rem',
                    color: 'var(--primary-color)',
                    borderBottom: '2px solid var(--border-color)',
                    paddingBottom: '0.5rem',
                  }}
                >
                  {DAYS_MAP[dayOfWeek]} - {dateStr}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {dayClasses.map((cls) => {
                    const reservation = reservations.find(
                      (r) =>
                        r.enrollments?.class_id === cls.id &&
                        r.date === dateStr &&
                        r.status !== 'cancelled'
                    );

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
                          border: '1px solid var(--border-color)',
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
                              marginTop: '0.25rem',
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
                                gap: '0.5rem',
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
                                  gap: '0.5rem',
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
                                handleBooking(
                                  cls.id,
                                  classDate,
                                  'enroll',
                                  cls.start_time,
                                  cls.activity_name
                                )
                              }
                              disabled={!isActivityAvailable(cls.activity_name)}
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
