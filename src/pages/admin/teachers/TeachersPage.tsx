import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { useUsersStore } from '@/core/store/useUsersStore';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import { usersService } from '@/core/services';
import { TeacherList } from './components/TeacherList';
import { TeacherFormModal } from './components/TeacherFormModal';
import { ConfirmModal } from '@/components/ui';

export function TeachersPage() {
  const { showError, showSuccess } = useAlert();
  const { teachers, loading, fetchTeachers } = useUsersStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    try {
      await usersService.deleteUser(deletingId);
      fetchTeachers();
      showSuccess('Profesor eliminado.');
    } catch (error) {
      showError('Error al borrar profesor');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.email && t.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Gestión de Profesores</h1>
          <p>Administrá al equipo docente.</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setIsModalOpen(true)}
          title="Nuevo Profesor"
        >
          <UserPlus size={20} />
          <span>Nuevo Profesor</span>
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <input 
          type="text" 
          placeholder="Buscar profesor..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '400px' }}
        />
      </div>

      <TeacherList 
        teachers={filteredTeachers} 
        loading={loading} 
        onDelete={handleDelete}
      />

      <TeacherFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchTeachers();
          setIsModalOpen(false);
        }}
      />

      <ConfirmModal
        isOpen={!!deletingId}
        title="Eliminar Profesor"
        message="¿Eliminar a este profesor? Se desvinculará de sus clases actuales."
        confirmText="Eliminar"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
