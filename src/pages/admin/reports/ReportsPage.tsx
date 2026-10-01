import { useState, useMemo } from 'react';
import { BarChart3, Users, Calendar, DollarSign, TrendingDown, Award } from 'lucide-react';
import { Loader } from '@/ui';
import { formatCurrency } from '@/core/utils/formatCurrency';
import { useReportsData } from '@/core/hooks/admin/useReportsData';
import type { ReportTab } from '@/core/types/reports.types';
import './reports.css';

// Inline `style` is needed for values computed at runtime (bar heights/widths).
// This type keeps those CSS custom properties cast-free.
type CSSVars = React.CSSProperties & Record<`--${string}`, string>;

const DAYS_MAP: Record<number, string> = {
  0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb',
};

function getMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' });
}

function BarChart({ data, max }: { data: number[]; max: number }) {
  return (
    <div className="mini-bar-chart">
      {data.map((value, i) => {
        const style: CSSVars = {
          '--mini-bar-height': max > 0 ? `${(value / max) * 100}%` : '0%',
        };
        return (
          <div
            key={i}
            className="mini-bar-chart__bar"
            style={style}
            title={formatCurrency(value)}
          />
        );
      })}
    </div>
  );
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('attendance-student');
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      start: start.toISOString().split('T')[0],
      end: now.toISOString().split('T')[0],
    };
  });

  const {
    attendanceByStudent,
    attendanceByClass,
    revenue,
    popular,
    commissions,
    retention,
    loading,
  } = useReportsData(activeTab, dateRange);

  const revenueMax = useMemo(() => Math.max(...revenue.map((r) => r.total), 1), [revenue]);
  const popularMax = useMemo(() => Math.max(...popular.map((p) => p.enrollment_count), 1), [popular]);

  const tabs: { key: ReportTab; label: string; icon: React.ReactNode }[] = [
    { key: 'attendance-student', label: 'Asistencia / Alumno', icon: <Users size={16} /> },
    { key: 'attendance-class', label: 'Asistencia / Clase', icon: <Calendar size={16} /> },
    { key: 'revenue', label: 'Ingresos', icon: <DollarSign size={16} /> },
    { key: 'popular', label: 'Clases Populares', icon: <Award size={16} /> },
    { key: 'commissions', label: 'Comisiones', icon: <BarChart3 size={16} /> },
    { key: 'retention', label: 'Retención', icon: <TrendingDown size={16} /> },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Reportes</h1>
          <p className="text-secondary">Métricas y análisis del estudio.</p>
        </div>
      </div>

      <div className="reports-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`reports-tab ${activeTab === tab.key ? 'reports-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab !== 'revenue' && activeTab !== 'popular' && activeTab !== 'retention' && (
        <div className="reports-date-filter">
          <label>
            Desde
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
            />
          </label>
        </div>
      )}

      <div className="reports-content">
        {loading ? (
          <div className="reports-loading">
            <Loader text="Cargando reporte..." />
          </div>
        ) : (
          <>
            {/* Attendance by Student */}
            {activeTab === 'attendance-student' && (
              <div className="report-table-wrapper">
                {attendanceByStudent.length === 0 ? (
                  <div className="empty-state-cell">No hay datos de asistencia en este período.</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Alumno</th>
                        <th className="reports-cell--center">Presente</th>
                        <th className="reports-cell--center">Ausente</th>
                        <th className="reports-cell--center">Cancelado</th>
                        <th className="reports-cell--center">Total</th>
                        <th className="reports-cell--right">Asistencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceByStudent.map((s) => (
                        <tr key={s.student_id}>
                          <td><strong>{s.full_name}</strong></td>
                          <td className="reports-cell--center">{s.attended}</td>
                          <td className="reports-cell--center">{s.absent}</td>
                          <td className="reports-cell--center">{s.cancelled}</td>
                          <td className="reports-cell--center">{s.total}</td>
                          <td className="reports-cell--right">
                            <span className={`badge ${s.total > 0 && (s.attended / s.total) >= 0.8 ? 'badge-active' : 'badge-pending'}`}>
                              {s.total > 0 ? Math.round((s.attended / s.total) * 100) : 0}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Attendance by Class */}
            {activeTab === 'attendance-class' && (
              <div className="report-table-wrapper">
                {attendanceByClass.length === 0 ? (
                  <div className="empty-state-cell">No hay datos de asistencia en este período.</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Clase</th>
                        <th>Día</th>
                        <th className="reports-cell--center">Inscriptos</th>
                        <th className="reports-cell--center">Presentes</th>
                        <th className="reports-cell--center">Ausentes</th>
                        <th className="reports-cell--right">Asistencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceByClass.map((c) => (
                        <tr key={c.class_id}>
                          <td><strong>{c.activity_name}</strong></td>
                          <td>{DAYS_MAP[c.day_of_week]}</td>
                          <td className="reports-cell--center">{c.total_enrolled}</td>
                          <td className="reports-cell--center">{c.attended}</td>
                          <td className="reports-cell--center">{c.absent}</td>
                          <td className="reports-cell--right">
                            <span className={`badge ${c.attendance_rate >= 80 ? 'badge-active' : 'badge-pending'}`}>
                              {c.attendance_rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Revenue */}
            {activeTab === 'revenue' && (
              <div className="report-table-wrapper">
                {revenue.length === 0 ? (
                  <div className="empty-state-cell">No hay datos de ingresos.</div>
                ) : (
                  <>
                    <div className="revenue-chart">
                      <BarChart data={revenue.map((r) => r.total)} max={revenueMax} />
                      <div className="revenue-labels">
                        {revenue.map((r) => (
                          <span key={r.month}>{getMonthLabel(r.month)}</span>
                        ))}
                      </div>
                    </div>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Mes</th>
                          <th className="reports-cell--right">Ingresos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revenue.map((r) => (
                          <tr key={r.month}>
                            <td>{getMonthLabel(r.month)}</td>
                            <td className="reports-cell--amount">
                              {formatCurrency(r.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                )}
              </div>
            )}

            {/* Popular Classes */}
            {activeTab === 'popular' && (
              <div className="report-table-wrapper">
                {popular.length === 0 ? (
                  <div className="empty-state-cell">No hay datos de inscripciones.</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Actividad</th>
                        <th className="reports-cell--right">Inscripciones</th>
                        <th className="reports-column--bar"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {popular.map((p) => {
                        const fillStyle: CSSVars = {
                          '--horizontal-bar-width': `${(p.enrollment_count / popularMax) * 100}%`,
                        };
                        return (
                          <tr key={p.activity_name}>
                            <td><strong>{p.activity_name}</strong></td>
                            <td className="reports-cell--bold">{p.enrollment_count}</td>
                            <td>
                              <div className="horizontal-bar">
                                <div
                                  className="horizontal-bar__fill"
                                  style={fillStyle}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Teacher Commissions */}
            {activeTab === 'commissions' && (
              <div className="report-table-wrapper">
                {commissions.length === 0 ? (
                  <div className="empty-state-cell">No hay datos de comisiones en este período.</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Profesor</th>
                        <th className="reports-cell--center">Clases</th>
                        <th className="reports-cell--right">Total Ganado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissions.map((c) => (
                        <tr key={c.teacher_id}>
                          <td><strong>{c.full_name}</strong></td>
                          <td className="reports-cell--center">{c.class_count}</td>
                          <td className="reports-cell--amount">
                            {formatCurrency(c.total_earned)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Retention */}
            {activeTab === 'retention' && (
              <div className="report-table-wrapper">
                {retention.length === 0 ? (
                  <div className="empty-state-cell">No hay datos de retención.</div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Alumno</th>
                        <th>Última Asistencia</th>
                        <th className="reports-cell--right">Días sin asistir</th>
                        <th className="reports-cell--right">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {retention.map((r) => (
                        <tr key={r.student_id}>
                          <td><strong>{r.full_name}</strong></td>
                          <td>{r.last_attendance ? new Date(`${r.last_attendance}T00:00:00`).toLocaleDateString('es-AR') : 'Sin asistencias'}</td>
                          <td className="reports-cell--right">{r.days_since_last ?? '—'}</td>
                          <td className="reports-cell--right">
                            {r.days_since_last === null ? (
                              <span className="badge badge-inactive">Sin asistencias</span>
                            ) : (
                              <span className={`badge ${r.days_since_last <= 7 ? 'badge-active' : r.days_since_last <= 30 ? 'badge-pending' : 'badge-inactive'}`}>
                                {r.days_since_last <= 7 ? 'Activo' : r.days_since_last <= 30 ? 'En riesgo' : 'Inactivo'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
