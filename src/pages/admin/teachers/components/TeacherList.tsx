import { Trash2, Pencil } from 'lucide-react';
import type { UserProfile } from '@/core/types/users.types';
import { DataTable, type Column, Button } from '@/components/ui';

interface TeacherListProps {
  teachers: UserProfile[];
  loading: boolean;
  onDelete: (id: string) => void;
  onEdit: (teacher: UserProfile) => void;
}

export function TeacherList({ teachers, loading, onDelete, onEdit }: TeacherListProps) {
  const columns: Column<UserProfile>[] = [
    {
      key: 'name_contact',
      header: 'Nombre y Contacto',
      className: 'mobile-card-header',
      render: (teacher) => (
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', gap: '1rem' }}>
          <div style={{
            width: '42px', height: '42px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', flexShrink: 0, boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
          }}>
            {teacher.full_name.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '0.15rem' }}>
            <div style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{teacher.full_name}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{teacher.email}</div>
            {teacher.phone && teacher.phone !== '-' && (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {teacher.phone}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'commissions',
      header: 'Comisiones Asignadas',
      render: (teacher) => (
        <div className="cell-flex" style={{ flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right', gap: '0.25rem' }}>
          {teacher.classes && teacher.classes.length > 0 ? (
            teacher.classes.map((cls, idx) => (
              <div key={idx} style={{ fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-secondary)', marginRight: '0.5rem' }}>{cls.activity_name}:</span>
                <span className="text-success" style={{ fontWeight: '600' }}>{cls.teacher_commission_pct}%</span>
              </div>
            ))
          ) : (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sin clases</span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (teacher) => (
        <div className="actions-flex" style={{ justifyContent: 'flex-end' }}>
          <Button variant="icon" onClick={() => onEdit(teacher)}>
            <Pencil size={18} />
          </Button>
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
