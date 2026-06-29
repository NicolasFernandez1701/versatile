import { useEffect, useState } from 'react';
import { Wallet, Plus, Activity, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { financesService, dashboardService, type FinancialBalance } from '@/core/services';
import { formatCurrency } from '@/core/utils/formatCurrency';
import type { PaymentEntity } from '@/core/types/finances.types';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { usePaymentHistory } from './hooks/usePaymentHistory';
import { DataTable, type Column, Button, Loader, Select, Input } from '@/components/ui';
import { useAuthStore } from '@/core/store/useAuthStore';

export function FinancesPage() {
  const { current_studio_id } = useAuthStore();
  const [payments, setPayments] = useState<PaymentEntity[]>([]);
  const [balance, setBalance] = useState<FinancialBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Tabs State
  const [activeTab, setActiveTab] = useState<'resumen' | 'historial'>('resumen');

  // Logic delegated to Custom Hook
  const {
    searchTerm,
    setSearchTerm,
    methodFilter,
    setMethodFilter,
    currentPage,
    setCurrentPage,
    paginatedPayments,
    filteredPayments,
    totalPages
  } = usePaymentHistory(payments);

  useEffect(() => {
    if (current_studio_id) {
      loadData();
    }
  }, [current_studio_id]);

  const loadData = async () => {
    if (!current_studio_id) return;
    try {
      setLoading(true);
      const [paymentsData, balanceData] = await Promise.all([
        financesService.getPayments(current_studio_id),
        dashboardService.getFinancialBalance(current_studio_id)
      ]);
      setPayments(paymentsData);
      setBalance(balanceData);
    } catch (error) {
      console.error('Error al cargar datos financieros:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<PaymentEntity>[] = [
    {
      key: 'date',
      header: 'Fecha',
      render: (p) => new Date(p.payment_date).toLocaleDateString()
    },
    {
      key: 'student',
      header: 'Alumno',
      render: (p) => (
        <div className="cell-flex">
          <Wallet size={16} className="text-primary" />
          <strong>{p.profiles?.full_name || 'Desconocido'}</strong>
        </div>
      )
    },
    {
      key: 'amount',
      header: 'Monto (Neto)',
      render: (p) => (
        <span className="text-primary" style={{ fontWeight: 'bold' }}>
          {formatCurrency(p.amount)}
        </span>
      )
    },
    {
      key: 'method',
      header: 'Método',
      render: (p) => <span style={{ textTransform: 'capitalize' }}>{p.payment_method}</span>
    },
    {
      key: 'details',
      header: 'Detalles',
      render: (p) => p.plan_details
    },
    {
      key: 'audit',
      header: 'Auditoría (Mora/Promo)',
      render: (p) => (
        <ul className="activity-list">
          {p.late_fee_applied && (
            <li className="text-danger">Mora aplicada (+{formatCurrency(p.surcharge_applied)})</li>
          )}
          {p.discount_applied > 0 && (
            <li className="text-success">Descuento aplicado (-{formatCurrency(p.discount_applied)})</li>
          )}
          {p.original_amount !== p.amount && !p.late_fee_applied && p.discount_applied === 0 && (
            <li>Editado manualmente</li>
          )}
        </ul>
      )
    }
  ];

  const planNames = balance ? Object.keys(balance.annualByPlan).sort() : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Finanzas</h1>
          <p>Registro histórico de pagos y reportes financieros.</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={20} />
          <span>Registrar Cobro</span>
        </Button>
      </div>

      {loading || !balance ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
          <Loader text="Cargando datos financieros..." />
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              borderBottom: '2px solid var(--border-color)',
              marginBottom: '1rem',
              marginTop: '-0.5rem'
            }}
          >
            <button
              onClick={() => setActiveTab('resumen')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'resumen' ? 'var(--surface-hover)' : 'none',
                border: 'none',
                borderBottom:
                  activeTab === 'resumen'
                    ? '3px solid var(--primary-color)'
                    : '3px solid transparent',
                color: activeTab === 'resumen' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: activeTab === 'resumen' ? 700 : 500,
                fontSize: '1rem',
                transition: 'all 0.2s',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
                marginBottom: '-2px'
              }}
            >
              Resumen por Plan
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'historial' ? 'var(--surface-hover)' : 'none',
                border: 'none',
                borderBottom:
                  activeTab === 'historial'
                    ? '3px solid var(--primary-color)'
                    : '3px solid transparent',
                color: activeTab === 'historial' ? 'var(--text-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: activeTab === 'historial' ? 700 : 500,
                fontSize: '1rem',
                transition: 'all 0.2s',
                borderTopLeftRadius: '8px',
                borderTopRightRadius: '8px',
                marginBottom: '-2px'
              }}
            >
              Historial de Pagos
            </button>
          </div>

          {activeTab === 'resumen' && (
            <div className="dashboard-section" style={{ marginBottom: '1rem' }}>
              <h2 className="section-title">Desglose Financiero por Plan</h2>
              <div className="table-container" style={{ marginTop: '0' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th style={{ textAlign: 'right' }}>Recaudación Mensual</th>
                      <th style={{ textAlign: 'right' }}>Recaudación Anual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {planNames.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="empty-state-cell">
                          No hay cobros registrados en el año.
                        </td>
                      </tr>
                    ) : (
                      planNames.map((planName) => (
                        <tr key={planName}>
                          <td>
                            <div className="cell-flex">
                              <Activity size={16} className="text-primary" />
                              <strong>{planName}</strong>
                            </div>
                          </td>
                          <td
                            data-label="Mensual"
                            style={{
                              textAlign: 'right',
                              fontWeight: 600,
                              color: 'var(--success-color)'
                            }}
                          >
                            {formatCurrency(balance.monthlyByPlan[planName] || 0)}
                          </td>
                          <td
                            data-label="Anual"
                            style={{
                              textAlign: 'right',
                              fontWeight: 600,
                              color: 'var(--primary-color)'
                            }}
                          >
                            {formatCurrency(balance.annualByPlan[planName])}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'historial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  marginBottom: '0.25rem',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}
              >
                <div
                  style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}
                >
                  <div style={{ width: '250px' }}>
                    <Input
                      type="text"
                      icon={<Search size={16} />}
                      placeholder="Buscar alumno o plan..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div style={{ width: '180px' }}>
                    <Select
                      options={[
                        { value: 'all', label: 'Todos los métodos' },
                        { value: 'transferencia', label: 'Transferencias' },
                        { value: 'efectivo', label: 'Efectivo' }
                      ]}
                      value={methodFilter}
                      onChange={(e) => setMethodFilter(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <DataTable
                columns={columns}
                data={paginatedPayments}
                loading={loading}
                keyExtractor={(p) => p.id}
                emptyMessage={
                  searchTerm || methodFilter !== 'all'
                    ? 'No se encontraron pagos con esos filtros.'
                    : 'No hay pagos registrados.'
                }
              />

              {filteredPayments.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '1.5rem',
                    marginTop: '1rem'
                  }}
                >
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} /> Anterior
                  </Button>
                  <span className="text-secondary" style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente <ChevronRight size={16} />
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      <RecordPaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          loadData();
        }}
      />
    </div>
  );
}
