import { useState, useEffect } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { supabase } from '@/core/services/supabase';
import { attendanceService } from '@/core/services';
import { Loader, Button } from '@/components/ui';
import { CalendarDays, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import '@/pages/admin/dashboard/dashboard.css';

const DAYS_MAP: Record<number, string> = {
  0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado'
};

export function StudentClassesPage() {
  const { user } = useAuthStore();
  const { showSuccess, showError } = useAlert();
  
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [attendances, setAttendances] = useState<any[]>([]);

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
      // Traer enrollments del alumno con la info de la clase
      const { data: enrData, error: enrError } = await supabase
        .from('enrollments')
        .select(`
          id,
          class_id,
          classes (
            id,
            activity_name,
            day_of_week,
            start_time,
            end_time
          )
        `)
        .eq('student_id', user.id);
      
      if (enrError) throw enrError;
      setEnrollments(enrData || []);

      // Traer asistencias
      const attData = await attendanceService.getStudentAttendances(user.id);
      setAttendances(attData);

    } catch (error: any) {
      showError('Error cargando las clases: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (Object.keys(weekDates).length > 0) {
      loadData();
    }
  }, [user?.id, weekDates]);

  const handleBooking = async (enrollmentId: string, classDate: Date, action: 'confirmed' | 'cancelled', startTime: string) => {
    try {
      // Validación estricta de tiempo simulada en front
      const now = new Date();
      const classDateTime = new Date(classDate);
      const [hours, minutes] = startTime.split(':');
      classDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      const diffMs = classDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (action === 'confirmed' && diffHours < 1.5) {
        showError('No podés anotarte con menos de 1.30 hs de anticipación.');
        return;
      }

      if (action === 'cancelled' && diffHours < 1.0) {
        showError('No podés cancelar con menos de 1 hora de anticipación.');
        return;
      }

      const dateStr = classDate.toISOString().split('T')[0];
      await attendanceService.toggleStudentBooking(enrollmentId, dateStr, action);
      showSuccess(action === 'confirmed' ? '¡Lugar reservado con éxito!' : 'Reserva cancelada.');
      loadData(); // Recargar datos para reflejar estado real
    } catch (error: any) {
      showError('Error al procesar reserva: ' + error.message);
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Loader /></div>;
  }

  // Combinar enrollments con fechas de la semana y estado de asistencia
  const upcomingClasses = enrollments.map(enr => {
    const cls = enr.classes;
    const classDate = weekDates[cls.day_of_week];
    const dateStr = classDate?.toISOString().split('T')[0];
    
    // Buscar si ya hay un registro de asistencia para esa fecha
    const attRecord = attendances.find(a => a.enrollment_id === enr.id && a.date === dateStr);
    const status = attRecord?.status || 'none'; // none, confirmed, cancelled, present, absent

    return {
      enrollmentId: enr.id,
      classInfo: cls,
      classDate,
      dateStr,
      status
    };
  }).sort((a, b) => a.classDate?.getTime() - b.classDate?.getTime());

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1>Mis Clases de la Semana</h1>
          <p className="text-secondary">Anotate a las clases de tu plan o cancelá tu reserva si no podés asistir.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flex: 1, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, background: 'var(--surface-color)', borderRadius: '16px', border: '1px solid var(--border-color)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {upcomingClasses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
              <p className="text-secondary">No estás inscripto a ninguna clase semanal.</p>
              <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Contactá a recepción para asignar los horarios de tu plan.</p>
            </div>
          ) : (
            upcomingClasses.map((item, index) => {
              // Calcular si la clase ya pasó
              const now = new Date();
              const classDateTime = new Date(item.classDate);
              const [hours, minutes] = item.classInfo.start_time.split(':');
              classDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
              const isPast = now > classDateTime;

              return (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'var(--background-color)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <h3 style={{ marginBottom: '0.25rem' }}>{item.classInfo.activity_name}</h3>
                    <p className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <CalendarDays size={16} /> {DAYS_MAP[item.classInfo.day_of_week]} {item.dateStr}
                    </p>
                    <p className="text-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                      <Clock size={16} /> {item.classInfo.start_time.substring(0, 5)} hs
                    </p>
                  </div>
                  
                  <div>
                    {isPast ? (
                      <span style={{ color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         {item.status === 'present' ? <><CheckCircle size={18} color="var(--success-color)"/> Presente</> : 
                          item.status === 'absent' ? <><XCircle size={18} color="var(--error-color)"/> Ausente</> : 
                          'Clase Finalizada'}
                      </span>
                    ) : item.status === 'confirmed' ? (
                      <Button 
                        variant="danger" 
                        onClick={() => handleBooking(item.enrollmentId, item.classDate, 'cancelled', item.classInfo.start_time)}
                      >
                        Cancelar Reserva
                      </Button>
                    ) : (
                      <Button 
                        variant="primary" 
                        onClick={() => handleBooking(item.enrollmentId, item.classDate, 'confirmed', item.classInfo.start_time)}
                      >
                        Anotarme
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
