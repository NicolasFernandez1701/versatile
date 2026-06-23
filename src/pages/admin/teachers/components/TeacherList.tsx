import { Trash2, DollarSign } from 'lucide-react';
import type { UserProfile } from '@/core/types/users.types';
import { DataTable, type Column, Button } from '@/components/ui';

interface TeacherListProps {
  teachers: UserProfile[];
  loading: boolean;
  onDelete: (id: string) => void;
}

export function TeacherList({ teachers, loading, onDelete }: TeacherListProps) {
  const columns: Column<UserProfile>[] = [
    {
      key: 'name_contact',
      header: 'Nombre y Contacto',
      render: (teacher) => (
        <>
          <div style={{ fontWeight: '600' }}>{teacher.full_name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{teacher.email}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {teacher.phone || '-'}
          </div>
        </>
      )
    },
    {
      key: 'commissions',
      header: 'Comisiones Asignadas',
      render: () => (
        <div className="cell-flex text-success">
          <DollarSign size={16} />
          <span>Configuradas por Clase (Clases)</span>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (teacher) => (
        <div className="actions-flex">
          <Button variant="danger" onClick={() => onDelete(teacher.id)}>
            <Trash2 size={18} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <DataTable
      columns={columns}
      data={teachers}
      loading={loading}
      keyExtractor={(t) => t.id}
      emptyMessage="No hay profesores registrados."
    />
  );
}
