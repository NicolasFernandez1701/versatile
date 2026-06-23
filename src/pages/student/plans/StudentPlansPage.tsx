import { useState, useEffect } from 'react';
import { useAuthStore } from '@/core/store/useAuthStore';
import { plansService, dashboardService } from '@/core/services';
import type { PlanEntity } from '@/core/types/plans.types';
import { Loader, Button } from '@/components/ui';
import { Check, Star, CheckCircle } from 'lucide-react';
import '@/pages/admin/dashboard/dashboard.css';

export function StudentPlansPage() {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState<PlanEntity[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const plansData = await plansService.getActivePlans();
        setPlans(plansData);

        if (user) {
          const dashboardData = await dashboardService.getStudentDashboardData(user.id);
          if (dashboardData.activePlan?.plan_id) {
            setActivePlanId(dashboardData.activePlan.plan_id);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleRequestPlan = (planName: string) => {
    const phone = '5491162676855'; // Número proporcionado por el usuario
    const message = `Hola Versatile Studio! 🌟\n\nQuiero solicitar el *${planName}* que vi en la app.\n¿Me pasan la info para realizar el pago por favor?`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
        <Loader />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div
        className="page-header"
        style={{
          marginBottom: '2rem',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Nuestros Planes</h1>
        <p className="text-secondary" style={{ maxWidth: '600px' }}>
          Elegí el plan que mejor se adapte a tu entrenamiento y descubrí tu mejor versión con
          nosotros.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '2rem',
          justifyContent: 'center',
          alignItems: 'stretch'
        }}
      >
        {plans.map((plan, index) => {
          const isActive = plan.id === activePlanId;
          // Si no hay plan activo, destacamos el del medio o el que diga "premium"
          const isHighlighted =
            isActive ||
            (!activePlanId &&
              (index === Math.floor(plans.length / 2) ||
                plan.name.toLowerCase().includes('premium')));

          return (
            <div
              key={plan.id}
              style={{
                background: isHighlighted
                  ? 'linear-gradient(145deg, var(--surface-color), var(--surface-hover))'
                  : 'var(--surface-color)',
                border: isActive
                  ? '2px solid var(--success-color)'
                  : isHighlighted
                    ? '2px solid var(--primary-color)'
                    : '1px solid var(--border-color)',
                borderRadius: '24px',
                padding: '2rem',
                width: '100%',
                maxWidth: '350px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
                position: 'relative',
                boxShadow: isHighlighted ? '0 10px 30px rgba(0,0,0,0.5)' : 'none',
                transform: isHighlighted ? 'scale(1.02)' : 'scale(1)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}
            >
              {isHighlighted && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: isActive ? 'var(--success-color)' : 'var(--primary-color)',
                    color: 'white',
                    padding: '4px 16px',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                  }}
                >
                  {isActive ? (
                    <>
                      <CheckCircle size={14} /> TU PLAN ACTUAL
                    </>
                  ) : (
                    <>
                      <Star size={14} fill="currentColor" /> RECOMENDADO
                    </>
                  )}
                </div>
              )}

              <div style={{ textAlign: 'center' }}>
                <h3
                  style={{
                    fontSize: '1.5rem',
                    marginBottom: '1rem',
                    color: isHighlighted ? 'var(--primary-color)' : 'var(--text-primary)'
                  }}
                >
                  {plan.name}
                </h3>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                  ${plan.price.toLocaleString()}
                </div>
                <div
                  className="text-secondary"
                  style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}
                >
                  por mes
                </div>
              </div>

              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  marginTop: '1rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      background: 'var(--success-color)20',
                      color: 'var(--success-color)',
                      borderRadius: '50%',
                      padding: '4px'
                    }}
                  >
                    <Check size={16} />
                  </div>
                  <span style={{ fontWeight: 600 }}>{plan.classes_per_week} clases por semana</span>
                </div>

                {plan.plan_activities && plan.plan_activities.length > 0 && (
                  <div
                    style={{
                      paddingLeft: '2.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      fontSize: '0.9rem',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {plan.plan_activities.map((act) => (
                      <div key={act.id}>
                        • {act.classes_per_week}x {act.activity_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                variant={isActive ? 'secondary' : isHighlighted ? 'primary' : 'secondary'}
                style={{
                  width: '100%',
                  marginTop: '1rem',
                  padding: '1rem',
                  fontSize: '1.1rem',
                  borderRadius: '12px'
                }}
                onClick={() => handleRequestPlan(plan.name)}
                disabled={isActive}
              >
                {isActive ? 'Plan Activo' : 'Solicitar Plan'}
              </Button>
            </div>
          );
        })}

        {plans.length === 0 && !loading && (
          <div className="text-secondary">No hay planes activos publicados por el momento.</div>
        )}
      </div>
    </div>
  );
}
