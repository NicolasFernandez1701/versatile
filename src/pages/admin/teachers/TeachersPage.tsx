import { useEffect, useState } from 'react';
import { UserPlus, GraduationCap } from 'lucide-react';
import { useUsersStore } from '@/core/store/useUsersStore';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import { useAddSelfAsTeacher } from '@/core/hooks/useAddSelfAsTeacher';
import { usersService } from '@/core/services';
import { TeacherList } from './components/TeacherList';
import { TeacherFormModal } from './components/TeacherFormModal';
import { ConfirmModal } from '@/components/ui';
import type { UserProfile } from '@/core/types/users.types';
import './TeachersPage.css';

export function TeachersPage() {
  const { showError, showSuccess } = useAlert();
  const teachers = useUsersStore((state) => state.teachers);
  const loading = useUsersStore((state) => state.loading);
  const fetchTeachers = useUsersStore((state) => state.fetchTeachers);
  const { canAdd: showAddSelfAsTeacher, addSelfAsTeacher: handleAddSelfAsTeacher, isLoading: isAddingSelf } = useAddSelfAsTeacher();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<UserProfile | null>(null);
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

  const filteredTeachers = teachers.filter(
    (t) =>
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
        <div className="teachers-page-actions">
          {showAddSelfAsTeacher && (
            <button
              className="btn-secondary btn-add-self-teacher"
              onClick={handleAddSelfAsTeacher}
              disabled={isAddingSelf}
              title="Agregarme como profesor"
              aria-label="Agregarme como profesor"
            >
              <GraduationCap size={20} />
              <span>Agregarme como profesor</span>
            </button>
          )}
          <button className="btn-primary" onClick={() => { setEditingTeacher(null); setIsModalOpen(true); }} title="Nuevo Profesor">
            <UserPlus size={20} />
            <span>Nuevo Profesor</span>
          </button>
        </div>
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
        onEdit={(teacher) => {
          setEditingTeacher(teacher);
          setIsModalOpen(true);
        }}
      />

      <TeacherFormModal
        isOpen={isModalOpen}
        initialData={editingTeacher}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTeacher(null);
        }}
        onSuccess={() => {
          fetchTeachers();
          setIsModalOpen(false);
          setEditingTeacher(null);
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
