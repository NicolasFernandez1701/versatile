import { useAuthStore } from '@/core/store/useAuthStore';
import { CreditCard, CalendarDays, AlertTriangle } from 'lucide-react';
import { SummaryCard } from '@/pages/admin/dashboard/components/SummaryCard';
import '@/pages/admin/dashboard/dashboard.css';

export function StudentDashboard() {
  const { user } = useAuthStore();

  const cardStyle = {
    background: 'var(--surface-color)',
    borderRadius: '16px',
    border: '1px solid var(--border-color)',
    overflow: 'hidden'
  };

  const firstName = user?.profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Alumno';

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
          value="Plan Activo"
          subtitle="Tus clases semanales"
          icon={CreditCard}
        />

        <SummaryCard 
          title="Próxima Clase"
          value="Revisá tus reservas"
          icon={CalendarDays}
          iconColorClass="text-secondary"
        />
      </div>

      <div style={{ marginTop: '2rem' }}>
        <div style={cardStyle}>
          <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <AlertTriangle color="var(--warning-color)" size={24} style={{ flexShrink: 0 }} />
            <div>
              <h3 style={{ marginBottom: '0.5rem' }}>Recordatorio de Reservas</h3>
              <p className="text-secondary" style={{ lineHeight: 1.5 }}>
                Podés anotarte a las clases hasta <strong>1.30 hs antes</strong> de que comiencen. Si necesitás cancelar, tenés tiempo hasta <strong>1 hora antes</strong>. Evitá penalizaciones gestionando tus asistencias con tiempo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
