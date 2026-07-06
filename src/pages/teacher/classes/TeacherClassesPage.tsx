import { Loader, Button } from '@/ui';
import { CalendarDays, Users, CheckCircle, XCircle, Clock, UserCheck } from 'lucide-react';
import { useTeacherClasses } from '@/core/hooks/useTeacherClasses';
import { useClassAttendance } from '@/core/hooks/useClassAttendance';
import type { AttendanceRecord } from '@/core/types/attendance.types';
import '@/pages/admin/dashboard/dashboard.css';

const DAYS_MAP: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

export function TeacherClassesPage() {
  const { classes, loading, selectedClass, setSelectedClass, activeTab, setActiveTab, todayStr } =
    useTeacherClasses();
  const { enrollments, attendances, loadingDetails, handleToggleAttendance } = useClassAttendance({
    selectedClass,
    activeTab,
    todayStr,
  });

  const onToggleAttendance = (record: AttendanceRecord, newStatus: 'present' | 'absent') => {
    handleToggleAttendance(record, newStatus);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Loader />
      </div>
    );
  }

  return (
    <div
      className="page-container"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}
    >
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>Mis Clases</h1>
          <p className="text-secondary">Gestión de inscriptos y asistencia diaria.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flex: 1, alignItems: 'flex-start' }}>
        {/* Left Sidebar: Class List */}
        <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {classes.map((cls) => (
            <div
              key={cls.id}
              onClick={() => setSelectedClass(cls)}
              style={{
                background:
                  selectedClass?.id === cls.id ? 'var(--surface-hover)' : 'var(--surface-color)',
                border: `1px solid ${selectedClass?.id === cls.id ? 'var(--primary-color)' : 'var(--border-color)'}`,
                borderRadius: '12px',
                padding: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {cls.activity_name}
              </h4>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: 'var(--text-secondary)',
                  fontSize: '0.85rem',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <CalendarDays size={14} /> {DAYS_MAP[cls.day_of_week]}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={14} /> {cls.start_time.substring(0, 5)}
                </span>
              </div>
            </div>
          ))}
          {classes.length === 0 && (
            <p className="text-secondary text-center">No tenés clases asignadas.</p>
          )}
        </div>

        {/* Right Content: Class Details */}
        {selectedClass && (
          <div
            style={{
              flex: 1,
              background: 'var(--surface-color)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '1.5rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h2>{selectedClass.activity_name}</h2>
                <p className="text-secondary">
                  {DAYS_MAP[selectedClass.day_of_week]} de{' '}
                  {selectedClass.start_time.substring(0, 5)} a{' '}
                  {selectedClass.end_time.substring(0, 5)}
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  background: 'var(--background-color)',
                  padding: '0.25rem',
                  borderRadius: '8px',
                }}
              >
                <button
                  onClick={() => setActiveTab('asistencia')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500,
                    background: activeTab === 'asistencia' ? 'var(--primary-color)' : 'transparent',
                    color: activeTab === 'asistencia' ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  Asistencia de Hoy
                </button>
                <button
                  onClick={() => setActiveTab('padron')}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 500,
                    background: activeTab === 'padron' ? 'var(--primary-color)' : 'transparent',
                    color: activeTab === 'padron' ? 'white' : 'var(--text-secondary)',
                  }}
                >
                  Padrón Completo
                </button>
              </div>
            </div>

            <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
              {loadingDetails ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <Loader />
                </div>
              ) : activeTab === 'padron' ? (
                // Padrón View
                <div>
                  <h3
                    style={{
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Users size={20} /> Inscriptos Oficiales ({enrollments.length})
                  </h3>
                  {enrollments.length === 0 ? (
                    <p className="text-secondary text-center" style={{ padding: '2rem' }}>
                      No hay alumnos inscriptos en esta clase.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {enrollments.map((en) => (
                        <div
                          key={en.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '1rem',
                            background: 'var(--background-color)',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          <div>
                            <p style={{ fontWeight: 600 }}>{en.profiles?.full_name}</p>
                            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
                              {en.profiles?.phone || 'Sin teléfono'} • {en.profiles?.email}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // Asistencia View
                <div>
                  <h3
                    style={{
                      marginBottom: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <UserCheck size={20} /> Alumnos Confirmados ({attendances.length})
                  </h3>
                  <p
                    className="text-secondary"
                    style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}
                  >
                    Esta lista muestra solo a los alumnos que confirmaron su reserva para la clase
                    de hoy ({todayStr}).
                  </p>

                  {attendances.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: '3rem',
                        background: 'var(--background-color)',
                        borderRadius: '12px',
                      }}
                    >
                      <p className="text-secondary">Ningún alumno reservó su lugar para hoy.</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      {attendances.map((att) => (
                        <div
                          key={att.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '1rem',
                            background: 'var(--background-color)',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                          }}
                        >
                          <div>
                            <p style={{ fontWeight: 600 }}>
                              {att.enrollments?.profiles?.full_name}
                            </p>
                            <p className="text-secondary" style={{ fontSize: '0.85rem' }}>
                              Estado reserva:{' '}
                              {att.status === 'confirmed'
                                ? 'Confirmado'
                                : att.status === 'present'
                                  ? 'Presente'
                                  : 'Ausente'}
                            </p>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                              variant={att.status === 'present' ? 'primary' : 'secondary'}
                              onClick={() => onToggleAttendance(att, 'present')}
                              style={{ padding: '0.5rem 1rem' }}
                            >
                              <CheckCircle size={18} style={{ marginRight: '0.5rem' }} /> Presente
                            </Button>
                            <Button
                              variant={att.status === 'absent' ? 'primary' : 'secondary'}
                              onClick={() => onToggleAttendance(att, 'absent')}
                              style={{
                                padding: '0.5rem 1rem',
                                borderColor:
                                  att.status === 'absent' ? 'transparent' : 'var(--error-color)',
                                color: att.status === 'absent' ? 'white' : 'var(--error-color)',
                                background:
                                  att.status === 'absent' ? 'var(--error-color)' : 'transparent',
                              }}
                            >
                              <XCircle size={18} style={{ marginRight: '0.5rem' }} /> Ausente
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
