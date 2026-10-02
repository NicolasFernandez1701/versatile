import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/core/store/useAuthStore';
import { CreditCard, CalendarDays, AlertTriangle } from 'lucide-react';
import { SummaryCard } from '@/pages/admin/dashboard/components/SummaryCard';
import { useStudentDashboard } from '@/core/hooks/student/useStudentDashboard';
import { Loader } from '@/ui';
import '@/pages/admin/dashboard/dashboard.css';
import './StudentDashboard.css';

// Inline `style` is needed for values computed at runtime (quota fill width/color).
// This type keeps those CSS custom properties cast-free.
type CSSVars = React.CSSProperties & Record<`--${string}`, string>;

function QuotaRow({ name, consumed, total, remaining }: { name: string; consumed: number; total: number; remaining: number }) {
  const pct = total > 0 ? (consumed / total) * 100 : 0;
  const color = remaining > 0 ? 'var(--primary-color)' : 'var(--error-color)';
  const quotaStyle: CSSVars = {
    '--quota-fill-width': `${pct}%`,
    '--quota-color': color,
  };

  return (
    <div className="quota-row" style={quotaStyle}>
      <span className="quota-row__name">{name}</span>
      <div className="quota-row__track">
        <div className="quota-row__fill" />
      </div>
      <span className="quota-row__value">{consumed}/{total}</span>
    </div>
  );
}

export function StudentDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data, classLimit, loading } = useStudentDashboard(user?.id);

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

      <div className="student-dashboard__content">
        {classLimit && Object.keys(classLimit.perActivity).length > 0 && (
          <>
            <h2 className="student-dashboard__section-title">Mis Cupos del Mes</h2>
            <div className="student-dashboard__card student-dashboard__quotas">
              {Object.values(classLimit.perActivity).map((quota) => (
                <QuotaRow
                  key={quota.activity_name}
                  name={quota.activity_name}
                  consumed={quota.consumed}
                  total={quota.total}
                  remaining={quota.remaining}
                />
              ))}
            </div>
          </>
        )}

        <div className="student-dashboard__card">
          <div className="student-dashboard__reminder">
            <AlertTriangle color="var(--warning-color)" size={24} className="student-dashboard__reminder-icon" />
            <div>
              <h3 className="student-dashboard__reminder-title">Recordatorio de Reservas</h3>
              <p className="text-secondary student-dashboard__reminder-text">
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
