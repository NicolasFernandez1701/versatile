import { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { classesService } from '@/core/services';
import type { ClassEntity, EnrollmentEntity } from '@/core/types/classes.types';
import { useHolidays } from '@/core/hooks/useHolidays';
import { EnrolledStudentsModal } from '@/features/classes/components/EnrolledStudentsModal';
import { User } from 'lucide-react';
import './calendar.css';
import { Loader } from '@/components/ui';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function AdminCalendarPage() {
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [isDayExpanded, setIsDayExpanded] = useState(false);

  // Modal State for viewing students
  const [viewingStudentsClass, setViewingStudentsClass] = useState<ClassEntity | null>(null);
  const [students, setStudents] = useState<EnrollmentEntity[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const { loadingHolidays, getHolidayForDate } = useHolidays(activeStartDate.getFullYear());

  const fetchClasses = async () => {
    try {
      const data = await classesService.getClasses();
      setClasses(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const openStudentsModal = async (cls: ClassEntity) => {
    setViewingStudentsClass(cls);
    setLoadingStudents(true);
    try {
      // Formatear la fecha a YYYY-MM-DD para consultar la base de datos
      const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      const reservationDate = localDate.toISOString().split('T')[0];

      const data = await classesService.getEnrolledStudents(cls.id, reservationDate);
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoadingStudents(false);
    }
  };
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      if (getHolidayForDate(date)) {
        return 'react-calendar__tile--holiday';
      }
    }
    return null;
  };

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const holiday = getHolidayForDate(date);
      if (holiday) {
        return (
          <div
            className="holiday-dot"
            style={{ display: 'block', backgroundColor: 'var(--error-color)', zIndex: 100 }}
            title={holiday.motivo}
          ></div>
        );
      }
    }
    return null;
  };

  const selectedHoliday = getHolidayForDate(date);
  const dayOfWeek = date.getDay(); // 0 = Domingo, 1 = Lunes, etc.

  // Filtrar y ordenar las clases del día seleccionado
  const dayClasses = classes
    .filter((c) => c.day_of_week === dayOfWeek)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    setActiveStartDate(new Date(activeStartDate.getFullYear(), newMonth, 1));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    setActiveStartDate(new Date(newYear, activeStartDate.getMonth(), 1));
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre'
  ];

  return (
    <div className="page-container calendar-page">
      <div className="page-header">
        <h1>Grilla</h1>
      </div>

      {/* Mitad Superior: Calendario Interactivo */}
      <div className="calendar-container">
        <div className="calendar-fast-nav">
          <select
            className="calendar-select"
            value={activeStartDate.getMonth()}
            onChange={handleMonthChange}
          >
            {months.map((m, i) => (
              <option key={i} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            className="calendar-select"
            value={activeStartDate.getFullYear()}
            onChange={handleYearChange}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {loadingHolidays ? (
          <div
            style={{
              height: '350px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Loader text="Cargando fechas..." size="small" />
          </div>
        ) : (
          <Calendar
            onChange={(val) => {
              setDate(val as Date);
              setActiveStartDate(val as Date);
            }}
            value={date}
            activeStartDate={activeStartDate}
            onActiveStartDateChange={({ activeStartDate }) =>
              activeStartDate && setActiveStartDate(activeStartDate)
            }
            tileClassName={tileClassName}
            tileContent={tileContent}
            className="custom-calendar"
          />
        )}
        <div
          className="calendar-legend"
          style={{ marginTop: '1rem', padding: 0, boxShadow: 'none' }}
        >
          <div className="legend-item" style={{ justifyContent: 'center' }}>
            <div className="legend-dot dot-holiday"></div>
            <span className="legend-text">Feriado Nacional</span>
          </div>
        </div>
      </div>

      {/* Mitad Inferior: Grilla Dinámica del Día */}
      <div className="day-schedule-container">
        <h2 className="schedule-title">Agenda del Día</h2>

        {selectedHoliday && (
          <div className="holiday-alert">
            <strong>⚠️ Feriado:</strong> {selectedHoliday.motivo}. <br />
            Las clases podrían estar suspendidas.
          </div>
        )}

        {loading ? (
          <div style={{ padding: '2rem' }}>
            <Loader text="Cargando agenda..." size="medium" />
          </div>
        ) : dayClasses.length === 0 ? (
          <div className="empty-schedule">
            <p>No hay clases programadas para este día.</p>
          </div>
        ) : (
          <div className="schedule-list">
            <div className="schedule-card">
              <div
                className="schedule-card-header"
                onClick={() => setIsDayExpanded(!isDayExpanded)}
              >
                <h3 className="schedule-activity">
                  <span
                    style={{
                      transform: isDayExpanded ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s',
                      display: 'inline-block',
                      fontSize: '0.8rem'
                    }}
                  >
                    ▶
                  </span>
                  {DAYS[dayOfWeek]} {date.getDate()}
                </h3>
                <div className="schedule-time-badge">
                  <span>{dayClasses.length} Clases</span>
                </div>
              </div>

              {isDayExpanded && (
                <div
                  className="schedule-card-body"
                  style={{ flexDirection: 'column', gap: '1rem', alignItems: 'stretch' }}
                >
                  {dayClasses.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid var(--border-color)',
                        paddingBottom: '0.5rem',
                        cursor: 'pointer'
                      }}
                      onClick={() => openStudentsModal(c)}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <strong style={{ color: 'var(--primary-color)' }}>{c.activity_name}</strong>
                        <div
                          style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
                        >
                          <User size={12} /> Prof: {c.profiles?.full_name || 'Sin Asignar'}
                        </div>
                      </div>
                      <div
                        style={{
                          textAlign: 'right',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem'
                        }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {c.start_time.substring(0, 5)} - {c.end_time.substring(0, 5)} hs
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Anotados: {c.enrollments?.[0]?.count || 0} / {c.capacity}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <EnrolledStudentsModal
        title={viewingStudentsClass?.activity_name || 'Clase'}
        isOpen={!!viewingStudentsClass}
        onClose={() => setViewingStudentsClass(null)}
        students={students}
        isLoading={loadingStudents}
        onStudentRemoved={() => {
          if (viewingStudentsClass) {
            openStudentsModal(viewingStudentsClass);
            fetchClasses();
          }
        }}
      />
    </div>
  );
}
