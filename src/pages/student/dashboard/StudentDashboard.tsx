import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/store/useAuthStore';
import { CreditCard, CalendarDays, AlertTriangle } from 'lucide-react';
import { SummaryCard } from '@/pages/admin/dashboard/components/SummaryCard';
import { dashboardService } from '@/core/services';
import type { StudentDashboardData, StudentClassLimit } from '@/core/types/dashboard.types';
import { Loader } from '@/components/ui';
import '@/pages/admin/dashboard/dashboard.css';

export function StudentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [classLimit, setClassLimit] = useState<StudentClassLimit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      Promise.all([
        dashboardService.getStudentDashboardData(user.id),
        dashboardService.getStudentClassLimit(user.id)
      ])
        .then(([dashData, limitData]) => {
          setData(dashData);
          setClassLimit(limitData);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const cardStyle = {
    background: 'var(--surface-color)',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    overflow: 'hidden'
  };

  const firstName =
    user?.profile?.full_name?.split(' ')[0] ||
    user?.user_metadata?.full_name?.split(' ')[0] ||
    'Alumno';

  if (loading) {
    return (
      <div className="page-container flex-center">
        <Loader size="large" text="Cargando tu dashboard..." />
      </div>
    );
  }

  return (
    <div className="page-container dashboard-page">
      <div className="page-header">
        <div>
          <h1>Hola, {firstName}</h1>
          <p className="text-secondary">Bienvenido a Versatile Studio.</p>
        </div>
      </div>

      <div className="summary-grid">
        <SummaryCard
          title="Mi Plan Activo"
          value={data?.activePlan ? data.activePlan.plan_details : 'Sin Plan Activo'}
          subtitle={
            data?.activePlan
              ? `Vence: ${new Date(data.activePlan.expiration_date).toLocaleDateString('es-AR')}`
              : 'Hacé click para ver planes'
          }
          icon={CreditCard}
          onClick={() => navigate('/student/plans')}
          iconColorClass="text-primary"
        />

        <SummaryCard
          title="Próxima Clase"
          value={data?.nextClass?.classes ? `${data.nextClass.classes.activity_name}` : 'No tenés reservas'}
          subtitle={
            data?.nextClass?.classes
              ? `${new Date(data.nextClass.reservation_date).toLocaleDateString('es-AR')} a las ${data.nextClass.classes.start_time.substring(0, 5)}`
              : 'Hacé click para ver la grilla'
          }
          icon={CalendarDays}
          onClick={() => navigate('/student/classes')}
          iconColorClass={data?.nextClass?.classes ? 'text-success' : 'text-secondary'}
        />
      </div>

      <div style={{ marginTop: '2rem' }}>
        {classLimit && Object.keys(classLimit.perActivity).length > 0 && (
          <>
            <h2 style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>Mis Cupos del Mes</h2>
            <div className="summary-grid" style={{ marginBottom: '1.5rem' }}>
              {Object.entries(classLimit.perActivity).map(([_, quota]) => (
                <SummaryCard
                  key={quota.activity_name}
                  title={quota.activity_name}
                  value={`${quota.consumed} / ${quota.total}`}
                  subtitle={`${quota.remaining} disponibles`}
                  icon={CalendarDays}
                  onClick={() => navigate('/student/classes')}
                  iconColorClass={quota.remaining > 0 ? 'text-success' : 'text-error'}
                />
              ))}
            </div>
          </>
        )}

        <div style={cardStyle}>
          <div
            style={{ padding: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}
          >
            <AlertTriangle color="var(--warning-color)" size={24} style={{ flexShrink: 0 }} />
            <div>
              <h3 style={{ marginBottom: '0.5rem' }}>Recordatorio de Reservas</h3>
              <p className="text-secondary" style={{ lineHeight: 1.5 }}>
                Podés anotarte a las clases hasta <strong>1.30 hs antes</strong> de que comiencen.
                Si necesitás cancelar, tenés tiempo hasta <strong>1 hora antes</strong>. Evitá
                penalizaciones gestionando tus asistencias con tiempo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
