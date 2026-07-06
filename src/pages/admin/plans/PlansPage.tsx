import { useState } from 'react';

import { Tag, Plus, Trash2, Edit } from 'lucide-react';
import { usePlansManagement } from '@/core/hooks/admin/usePlansManagement';
import { formatCurrency } from '@/core/utils/formatCurrency';
import type { PlanEntity } from '@/core/types/plans.types';
import { PlanForm } from '@/pages/admin/plans/components/PlanForm';
import { Modal, ConfirmModal, DataTable, type Column, Button } from '@/ui';

export function PlansPage() {
  const {
    plans,
    availableClasses,
    loading,
    deletePlan,
    toggleStatus,
  } = usePlansManagement();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanEntity | null>(null);

  const handleDelete = async () => {
    if (!deletingPlanId) return;
    await deletePlan(deletingPlanId);
    setIsConfirmOpen(false);
    setDeletingPlanId(null);
  };

  const handleOpenModal = (plan?: PlanEntity) => {
    setSelectedPlan(plan || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedPlan(null);
    setIsModalOpen(false);
  };

  const handleSaveSuccess = () => {
    handleCloseModal();
  };

  const columns: Column<PlanEntity>[] = [
    {
      key: 'name',
      header: 'Nombre',
      render: (plan) => (
        <div className="cell-flex">
          <Tag size={16} className="text-primary" />
          <strong>{plan.name}</strong>
        </div>
      )
    },
    {
      key: 'price',
      header: 'Precio Mensual',
      render: (plan) => formatCurrency(plan.price)
    },
    {
      key: 'classes',
      header: 'Clases/Semana',
      render: (plan) => `${plan.classes_per_week} clases`
    },
    {
      key: 'composition',
      header: 'Composición',
      render: (plan) =>
        plan.plan_activities && plan.plan_activities.length > 0 ? (
          <ul className="activity-list">
            {plan.plan_activities.map((act) => (
              <li key={act.id}>
                {act.classes_per_week}x {act.activity_name}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-secondary">Genérico</span>
        )
    },
    {
      key: 'status',
      header: 'Estado',
      render: (plan) => (
        <span
          className={`status-badge ${plan.is_active ? 'active' : 'inactive'}`}
          onClick={() => toggleStatus(plan.id, plan.is_active)}
          style={{ cursor: 'pointer' }}
        >
          {plan.is_active ? 'Activo' : 'Inactivo'}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (plan) => (
        <div className="actions-flex">
          <Button variant="icon" onClick={() => handleOpenModal(plan)} title="Editar Plan">
            <Edit size={16} />
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setDeletingPlanId(plan.id);
              setIsConfirmOpen(true);
            }}
            title="Eliminar Plan"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Planes de Suscripción</h1>
          <p>Administrá los planes, precios y cantidad de clases.</p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()} title="Nuevo Plan">
          <Plus size={20} />
          <span>Crear Plan</span>
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={plans}
        loading={loading}
        keyExtractor={(p) => p.id}
        emptyMessage="No hay planes configurados."
      />
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={selectedPlan ? 'Editar Plan' : 'Crear Nuevo Plan'}
      >
        <PlanForm
          initialData={selectedPlan}
          availableClasses={availableClasses}
          onSuccess={handleSaveSuccess}
          onCancel={handleCloseModal}
        />
      </Modal>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Eliminar Plan"
        message="¿Estás seguro de que quieres eliminar este plan? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => {
          setIsConfirmOpen(false);
          setDeletingPlanId(null);
        }}
      />
    </div>
  );
}
