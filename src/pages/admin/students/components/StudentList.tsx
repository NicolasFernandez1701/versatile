import { Trash2, Edit, AlertCircle } from 'lucide-react';
import type { UserProfile } from '@/core/types/users.types';
import { DataTable, type Column, Button } from '@/components/ui';

interface StudentListProps {
  students: UserProfile[];
  loading: boolean;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export function StudentList({ students, loading, onDelete, onEdit }: StudentListProps) {
  const columns: Column<UserProfile>[] = [
    {
      key: 'name',
      header: 'Nombre',
      render: (student) => (
        <>
          <div style={{ fontWeight: '600' }}>{student.full_name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{student.email}</div>
        </>
      )
    },
    {
      key: 'contact',
      header: 'Contacto',
      render: (student) => student.phone || '-'
    },
    {
      key: 'plan',
      header: 'Plan Actual',
      render: (student) => {
        const hasPlan = !!student.plan_id;
        return hasPlan ? (
          <span className="text-primary">{student.plans?.name}</span>
        ) : (
          <span className="text-secondary">Sin plan</span>
        );
      }
    },
    {
      key: 'status',
      header: 'Estado (Vencimiento)',
      render: (student) => {
        const hasPlan = !!student.plan_id;
        const expDate = student.plan_expiration_date ? new Date(student.plan_expiration_date) : null;
        const isExpired = expDate ? expDate < new Date() : false;

        if (!hasPlan) {
          return <span className="status-badge inactive">Inactivo</span>;
        }
        if (isExpired) {
          return (
            <span className="status-badge inactive" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <AlertCircle size={14} /> Vencido
            </span>
          );
        }
        return (
          <span className="status-badge active">
            Vence {expDate?.toLocaleDateString()}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (student) => (
        <div className="actions-flex">
          <Button variant="icon" onClick={() => onEdit(student.id)} title="Editar Plan/Promo">
            <Edit size={18} />
          </Button>
          <Button variant="danger" onClick={() => onDelete(student.id)} title="Eliminar Alumno">
            <Trash2 size={18} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={students}
      loading={loading}
      keyExtractor={(s) => s.id}
      emptyMessage="No hay alumnos registrados."
    />
  );
}
