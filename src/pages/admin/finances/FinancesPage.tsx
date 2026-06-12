import { useEffect, useState } from 'react';
import { Wallet, Plus, Activity } from 'lucide-react';
import { financesService, dashboardService, type FinancialBalance } from '@/core/services';
import type { PaymentEntity } from '@/core/types/finances.types';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { DataTable, type Column, Button, Loader } from '@/components/ui';

export function FinancesPage() {
  const [payments, setPayments] = useState<PaymentEntity[]>([]);
  const [balance, setBalance] = useState<FinancialBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [paymentsData, balanceData] = await Promise.all([
        financesService.getPayments(),
        dashboardService.getFinancialBalance()
      ]);
      setPayments(paymentsData);
      setBalance(balanceData);
    } catch (error) {
      console.error('Error al cargar datos financieros:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<any>[] = [
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
      render: (p) => <span className="text-primary" style={{ fontWeight: 'bold' }}>${p.amount}</span>
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
          {p.late_fee_applied && <li className="text-danger">Mora aplicada (+${p.surcharge_applied})</li>}
          {p.discount_applied > 0 && <li className="text-success">Descuento aplicado (-${p.discount_applied})</li>}
          {p.original_amount !== p.amount && !p.late_fee_applied && p.discount_applied === 0 && (
            <li>Editado manualmente</li>
          )}
        </ul>
      )
    }
  ];

  const planNames = balance ? Object.keys(balance.annualByPlan).sort() : [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Finanzas</h1>
          <p>Registro histórico de pagos de alumnos y reportes financieros.</p>
        </div>
        <Button 
          variant="primary"
          onClick={() => setIsModalOpen(true)}
        >
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
          <div className="dashboard-section" style={{ marginBottom: '2rem' }}>
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
                      <td colSpan={3} className="empty-state-cell">No hay cobros registrados en el año.</td>
                    </tr>
                  ) : (
                    planNames.map(planName => (
                      <tr key={planName}>
                        <td>
                          <div className="cell-flex">
                            <Activity size={16} className="text-primary" />
                            <strong>{planName}</strong>
                          </div>
                        </td>
                        <td data-label="Mensual" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--success-color)' }}>
                          ${(balance.monthlyByPlan[planName] || 0).toLocaleString()}
                        </td>
                        <td data-label="Anual" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary-color)' }}>
                          ${balance.annualByPlan[planName].toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <h2 className="section-title" style={{ marginTop: '2rem' }}>Historial de Pagos</h2>
          <DataTable
            columns={columns}
            data={payments}
            loading={loading}
            keyExtractor={(p) => p.id}
            emptyMessage="No hay pagos registrados."
          />
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
