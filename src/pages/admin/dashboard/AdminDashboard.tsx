import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, TrendingUp, DollarSign, ClipboardList, BookOpen, Tag } from 'lucide-react';
import { SummaryCard } from './components/SummaryCard';
import { dashboardService, type DashboardStats, type FinancialBalance } from '@/core/services';
import type { ClassEntity } from '@/core/types/classes.types';
import { Loader } from '@/components/ui';
import './dashboard.css';

export function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [balance, setBalance] = useState<FinancialBalance | null>(null);
  const [todayClasses, setTodayClasses] = useState<ClassEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [s, b, c] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getFinancialBalance(),
        dashboardService.getTodayClasses()
      ]);
      setStats(s);
      setBalance(b);
      setTodayClasses(c);
    } catch (error) {
      console.error('Error cargando el dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats || !balance) {
    return (
      <div
        className="page-container"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh'
        }}
      >
        <Loader text="Cargando métricas..." />
      </div>
    );
  }

  return (
    <div className="page-container dashboard-page">
      <div className="dashboard-section">
        <h2 className="section-title">Vista General</h2>
        <div className="summary-grid">
          <SummaryCard
            title="Ingresos del Mes"
            value={`$${balance.monthlyTotal.toLocaleString()}`}
            icon={DollarSign}
            iconColorClass="text-success"
            onClick={() => navigate('/admin/finances')}
          />
          <SummaryCard
            title="Ingresos del Año"
            value={`$${balance.annualTotal.toLocaleString()}`}
            icon={TrendingUp}
            iconColorClass="text-primary"
            onClick={() => navigate('/admin/finances')}
          />
          <SummaryCard
            title="Alumnos Activos"
            value={stats.totalStudents}
            icon={Users}
            iconColorClass="text-primary"
            onClick={() => navigate('/admin/students')}
          />
          <SummaryCard
            title="Clases Activas"
            value={stats.activeClasses}
            icon={Calendar}
            iconColorClass="text-secondary"
            onClick={() => navigate('/admin/classes')}
          />
        </div>
      </div>

      <div className="dashboard-section hide-on-desktop">
        <h2 className="section-title">Acciones Rápidas</h2>
        <div className="action-grid">
          {/* Fila 1: Gestión de Personas y Clases */}
          <button className="quick-action-btn" onClick={() => navigate('/admin/students')}>
            <div className="action-icon-wrapper bg-students">
              <Users size={24} color="#2E7D32" />
            </div>
            <span>Alumnos</span>
          </button>

          <button className="quick-action-btn" onClick={() => navigate('/admin/teachers')}>
            <div className="action-icon-wrapper bg-teachers">
              <BookOpen size={24} color="#6366f1" />
            </div>
            <span>Profesores</span>
          </button>

          <button className="quick-action-btn" onClick={() => navigate('/admin/calendar')}>
            <div className="action-icon-wrapper bg-calendar">
              <Calendar size={24} color="#0277BD" />
            </div>
            <span>Grilla</span>
          </button>

          {/* Fila 2: Gestión de Negocio y Finanzas */}
          <button className="quick-action-btn" onClick={() => navigate('/admin/plans')}>
            <div className="action-icon-wrapper bg-plans">
              <Tag size={24} color="#A794DF" />
            </div>
            <span>Planes</span>
          </button>

          <button className="quick-action-btn" onClick={() => navigate('/admin/enrollments')}>
            <div className="action-icon-wrapper bg-plans">
              <ClipboardList size={24} color="#6C5CE7" />
            </div>
            <span>Matrículas</span>
          </button>

          <button className="quick-action-btn" onClick={() => navigate('/admin/finances')}>
            <div className="action-icon-wrapper bg-payments">
              <DollarSign size={24} color="#F57F17" />
            </div>
            <span>Finanzas</span>
          </button>
        </div>
      </div>

      <div className="dashboard-section">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}
        >
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Clases de Hoy
          </h2>
        </div>

        <div className="today-classes-list">
          {todayClasses.length === 0 ? (
            <div
              className="empty-state-cell"
              style={{
                background: 'var(--surface-color)',
                borderRadius: 'var(--border-radius-sm)'
              }}
            >
              No hay clases programadas para hoy.
            </div>
          ) : (
            todayClasses.map((cls) => (
              <div key={cls.id} className="today-class-card">
                <div className="class-info">
                  <span className="class-name">{cls.activity_name}</span>
                  <span className="class-prof">
                    Prof: {cls.profiles?.full_name || 'Sin Asignar'}
                  </span>
                </div>
                <div className="class-time-badge">
                  <span>
                    {cls.start_time.substring(0, 5)} - {cls.end_time.substring(0, 5)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
