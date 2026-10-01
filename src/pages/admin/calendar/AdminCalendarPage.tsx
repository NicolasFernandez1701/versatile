import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useHolidays, getHolidayForDate } from '@/core/hooks/shared/useHolidays';
import { useAdminCalendarData } from '@/core/hooks/admin/useAdminCalendarData';
import { EnrolledStudentsModal } from '@/pages/admin/classes/components/EnrolledStudentsModal';
import { User } from 'lucide-react';
import './calendar.css';
import { Loader } from '@/ui';
import { useAuthStore } from '@/core/store/useAuthStore';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// The page owns the selected day, so it formats the reservation date the
// enrolled-students query expects (local day as YYYY-MM-DD).
function toReservationDate(day: Date): string {
  const localDate = new Date(day.getTime() - day.getTimezoneOffset() * 60000);
  return localDate.toISOString().split('T')[0];
}

export function AdminCalendarPage() {
  const { current_studio_id } = useAuthStore();

  // All data access lives in the hook; the page keeps UI state only.
  const {
    classes,
    loading,
    refetch,
    viewingStudentsClass,
    students,
    loadingStudents,
    openStudentsModal,
    closeStudentsModal
  } = useAdminCalendarData(current_studio_id ?? undefined);

  const [date, setDate] = useState<Date>(new Date());
  const [activeStartDate, setActiveStartDate] = useState<Date>(new Date());
  const [isDayExpanded, setIsDayExpanded] = useState(false);

  const { loadingHolidays, markedDates } = useHolidays(activeStartDate.getFullYear());

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      if (getHolidayForDate(date, markedDates)) {
        return 'react-calendar__tile--holiday';
      }
    }
    return null;
  };

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const holiday = getHolidayForDate(date, markedDates);
      if (holiday) {
        return <div className="holiday-dot" title={holiday.motivo}></div>;
      }
    }
    return null;
  };

  const selectedHoliday = getHolidayForDate(date, markedDates);
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
          <div className="calendar-holidays-loader">
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
        <div className="calendar-legend calendar-legend--compact">
          <div className="legend-item">
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
          <div className="calendar-schedule-loader">
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
                    className={
                      isDayExpanded
                        ? 'schedule-toggle-arrow schedule-toggle-arrow--expanded'
                        : 'schedule-toggle-arrow'
                    }
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
                <div className="schedule-card-body schedule-card-body--stacked">
                  {dayClasses.map((c) => (
                    <div
                      key={c.id}
                      className="schedule-class-row"
                      onClick={() => openStudentsModal(c, toReservationDate(date))}
                    >
                      <div className="schedule-class-info">
                        <strong className="schedule-class-name">{c.activity_name}</strong>
                        <div className="schedule-class-teacher">
                          <User size={12} /> Prof: {c.profiles?.full_name || 'Sin Asignar'}
                        </div>
                      </div>
                      <div className="schedule-class-times">
                        <div className="schedule-class-time">
                          {c.start_time.substring(0, 5)} - {c.end_time.substring(0, 5)} hs
                        </div>
                        <div className="schedule-class-capacity">
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
        onClose={closeStudentsModal}
        students={students}
        isLoading={loadingStudents}
        onStudentRemoved={() => {
          if (viewingStudentsClass) {
            openStudentsModal(viewingStudentsClass, toReservationDate(date));
            // Silent, as the previous local fetch was: removing a student must
            // not flash the agenda loader.
            refetch({ silent: true });
          }
        }}
      />
    </div>
  );
}
