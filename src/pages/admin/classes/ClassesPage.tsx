import { useState } from 'react';

import { Plus } from 'lucide-react';
import { useClassesManagement } from '@/core/hooks/useClassesManagement';
import type { ClassEntity } from '@/core/types/classes.types';
import { ClassCard } from '@/features/classes/components/ClassCard';
import { ClassForm } from '@/features/classes/components/ClassForm';
import { EnrolledStudentsModal } from '@/features/classes/components/EnrolledStudentsModal';
import { Modal, ConfirmModal, Loader } from '@/ui';
import '../../../features/classes/styles/classes.css';

export function ClassesPage() {
  const {
    classes,
    teachers,
    loading,
    viewingStudentsClass,
    students,
    loadingStudents,
    fetchClasses,
    deleteClass,
    openStudentsModal,
    closeStudentsModal,
  } = useClassesManagement();

  // Modal State for viewing students
  // (viewingStudentsClass, students and loadingStudents come from the hook)

  // Modal State for Class Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassEntity | null>(null);

  // Modal State for Confirm Delete
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

  const handleDeleteClick = (id: string) => {
    setDeletingClassId(id);
  };

  const confirmDelete = async () => {
    if (!deletingClassId) return;
    await deleteClass(deletingClassId);
    setDeletingClassId(null);
  };

  const openFormModal = (cls?: ClassEntity) => {
    setEditingClass(cls || null);
    setIsFormOpen(true);
  };

  const closeFormModal = () => {
    setEditingClass(null);
    setIsFormOpen(false);
  };

  const handleSaveSuccess = () => {
    closeFormModal();
    fetchClasses();
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 4rem)',
        overflow: 'hidden'
      }}
    >
      <div className="page-header">
        <div>
          <h1>Clases</h1>
          <p className="text-secondary">Gestión de clases y horarios</p>
        </div>
        <button className="btn-primary" onClick={() => openFormModal()} title="Nueva Clase">
          <Plus size={20} />
          <span>Nueva Clase</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '2rem' }}>
          <Loader text="Cargando clases..." size="medium" />
        </div>
      ) : classes.length === 0 ? (
        <p>No hay clases creadas aún.</p>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {classes.map((cls) => (
              <ClassCard
                key={cls.id}
                cls={cls}
                onDelete={handleDeleteClick}
                onEdit={() => openFormModal(cls)}
                onClick={openStudentsModal}
              />
            ))}
          </div>
        </div>
      )}

      <EnrolledStudentsModal
        title={viewingStudentsClass?.activity_name || ''}
        isOpen={!!viewingStudentsClass}
        onClose={closeStudentsModal}
        students={students}
        isLoading={loadingStudents}
        onStudentRemoved={() => {
          if (viewingStudentsClass) {
            openStudentsModal(viewingStudentsClass);
            fetchClasses();
          }
        }}
      />

      <Modal
        isOpen={isFormOpen}
        onClose={closeFormModal}
        title={editingClass ? 'Editar Clase' : 'Nueva Clase'}
      >
        <ClassForm
          teachers={teachers}
          onSuccess={handleSaveSuccess}
          initialData={editingClass || undefined}
        />
      </Modal>

      <ConfirmModal
        isOpen={!!deletingClassId}
        title="Eliminar Clase"
        message="¿Estás seguro de que quieres eliminar esta clase? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeletingClassId(null)}
      />
    </div>
  );
}
