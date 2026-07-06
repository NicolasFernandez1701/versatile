import { useEffect, useState } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { classesService } from '@/core/services';
import type { ClassEntity } from '@/core/types/classes.types';
import { Loader } from '@/ui';
import { Clock, Users } from 'lucide-react';
import '@/pages/admin/dashboard/dashboard.css'; // Reuse dashboard styles

const DAYS_MAP: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado'
};

export function TeacherDashboard() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      classesService
        .getClassesByTeacher(user.id)
        .then(setClasses)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user?.id]);

  const today = new Date().getDay();
  const todayClasses = classes.filter((c) => c.day_of_week === today);
  const upcomingClasses = classes.filter((c) => c.day_of_week !== today);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="text-secondary">Resumen de tus clases y alumnos.</p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader text="Cargando tu agenda..." />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className="dashboard-section">
            <h2 className="section-title">Tus Clases de Hoy ({DAYS_MAP[today]})</h2>
            {todayClasses.length === 0 ? (
              <div
                className="empty-state"
                style={{
                  background: 'var(--surface-color)',
                  padding: '2rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  textAlign: 'center'
                }}
              >
                <p className="text-secondary">No tenés clases programadas para hoy.</p>
              </div>
            ) : (
              <div className="grid-responsive">
                {todayClasses.map((cls) => {
                  const enrollmentsCount = cls.enrollments?.[0]?.count || 0;
                  return (
                    <div
                      key={cls.id}
                      className="summary-card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem',
                        padding: '1.5rem',
                        alignItems: 'flex-start'
                      }}
                    >
                      <div
                        style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}
                      >
                        <h3 style={{ fontSize: '1.2rem', color: 'var(--primary-color)' }}>
                          {cls.activity_name}
                        </h3>
                        <span className="status-badge status-active">Hoy</span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          width: '100%'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          <Clock size={16} />
                          <span>
                            {cls.start_time.substring(0, 5)} - {cls.end_time.substring(0, 5)}
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          <Users size={16} />
                          <span>
                            {enrollmentsCount} {enrollmentsCount === 1 ? 'Alumno' : 'Alumnos'}{' '}
                            inscritos
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="dashboard-section">
            <h2 className="section-title">Otras Clases en la Semana</h2>
            {upcomingClasses.length === 0 ? (
              <div
                className="empty-state"
                style={{
                  background: 'var(--surface-color)',
                  padding: '2rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                  textAlign: 'center'
                }}
              >
                <p className="text-secondary">No tenés otras clases asignadas en la semana.</p>
              </div>
            ) : (
              <div
                className="grid-responsive"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}
              >
                {upcomingClasses.map((cls) => {
                  const enrollmentsCount = cls.enrollments?.[0]?.count || 0;
                  return (
                    <div
                      key={cls.id}
                      style={{
                        background: 'var(--surface-color)',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color)',
                        padding: '1rem'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '0.5rem'
                        }}
                      >
                        <h4 style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                          {cls.activity_name}
                        </h4>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: 'var(--primary-color)',
                            fontWeight: 600,
                            background: 'var(--surface-hover)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px'
                          }}
                        >
                          {DAYS_MAP[cls.day_of_week]}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={14} /> {cls.start_time.substring(0, 5)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Users size={14} /> {enrollmentsCount}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
