import { useEffect, useState } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import { useUsersStore } from '@/core/store/useUsersStore';
import { useEnrollments } from '@/core/hooks/useEnrollments';
import type { EnrollmentEntity } from '@/core/types/enrollments.types';
import { DataTable, type Column } from '@/ui/DataTable';
import { Button } from '@/ui/Button';
import { EnrollmentFormModal } from './components/EnrollmentFormModal';
import { ConfirmModal } from '@/ui';
import { useAuthStore } from '@/core/store/useAuthStore';

export function EnrollmentsPage() {
  const { current_studio_id } = useAuthStore();
  const { fetchStudents } = useUsersStore();
  const { enrollments, loading, loadData, deleteEnrollment } = useEnrollments();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (current_studio_id) {
      fetchStudents();
    }
  }, [current_studio_id, fetchStudents]);

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    await deleteEnrollment(deletingId);
    setDeletingId(null);
  };

  const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const columns: Column<EnrollmentEntity>[] = [
    {
      key: 'date',
      header: 'Fecha de Reserva',
      render: (e) => new Date(e.reservation_date).toLocaleDateString()
    },
    {
      key: 'student',
      header: 'Alumno',
      render: (e) => e.profiles?.full_name
    },
    {
      key: 'class',
      header: 'Clase Asignada',
      render: (e) => (
        <span className="text-primary" style={{ fontWeight: 'bold' }}>
          {e.classes?.activity_name}
        </span>
      )
    },
    {
      key: 'time',
      header: 'Día y Hora',
      render: (e) =>
        `${DAYS[e.classes?.day_of_week || 0]} a las ${e.classes?.start_time?.substring(0, 5)}`
    },
    {
      key: 'status',
      header: 'Estado',
      render: (e) => {
        if (e.attendance_status === 'attended')
          return <span className="badge badge-active">Presente</span>;
        if (e.attendance_status === 'absent')
          return <span className="badge badge-inactive">Ausente</span>;
        if (e.attendance_status === 'cancelled')
          return <span className="badge badge-inactive">Cancelado</span>;
        return <span className="badge badge-pending">Pendiente</span>;
      }
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (e) => (
        <Button variant="danger" onClick={() => handleDeleteClick(e.id)}>
          <Trash2 size={18} />
        </Button>
      )
    }
  ];

  return (
    <div
      className="page-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 4rem)',
        overflow: 'hidden'
      }}
    >
      <div className="page-header">
        <div>
          <h1>Historial de Reservas</h1>
          <p>Visualizá las reservas de clases.</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <UserPlus size={20} />
          <span>Nueva Reserva Manual</span>
        </Button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem', paddingRight: '0.5rem' }}>
        <DataTable
          columns={columns}
          data={enrollments}
          loading={loading}
          keyExtractor={(e) => e.id}
          emptyMessage="No hay reservas."
        />
      </div>

      <EnrollmentFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadData}
        studioId={current_studio_id || ''}
      />

      <ConfirmModal
        isOpen={!!deletingId}
        title="Eliminar Inscripción"
        message="¿Estás seguro de que deseas desinscribir a este alumno de la clase? Se liberará el cupo."
        confirmText="Eliminar"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
