import { useState } from 'react';

import { Plus } from 'lucide-react';
import { useClassesManagement } from '@/core/hooks/admin/useClassesManagement';
import type { ClassEntity } from '@/core/types/classes.types';
import { ClassCard } from '@/pages/admin/classes/components/ClassCard';
import { ClassForm } from '@/pages/admin/classes/components/ClassForm';
import { EnrolledStudentsModal } from '@/pages/admin/classes/components/EnrolledStudentsModal';
import { Modal, ConfirmModal, Loader } from '@/ui';
import './components/classes.css';

export function ClassesPage() {
  const {
    classes,
    teachers,
    loading,
    viewingStudentsClass,
    students,
    loadingStudents,
    fetchClasses,
    deactivateClass,
    openStudentsModal,
    closeStudentsModal,
  } = useClassesManagement();

  // Modal State for viewing students
  // (viewingStudentsClass, students and loadingStudents come from the hook)

  // Modal State for Class Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassEntity | null>(null);

  // Confirmation state for deactivating a class
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleDeleteClick = (id: string) => {
    setDeletingClassId(id);
  };

  const confirmDeactivate = async () => {
    if (!deletingClassId || isDeactivating) return;
    setIsDeactivating(true);
    try {
      await deactivateClass(deletingClassId);
    } finally {
      setIsDeactivating(false);
      setDeletingClassId(null);
    }
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
    <div className="admin-page-shell">
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
        <div className="classes-loader-wrapper">
          <Loader text="Cargando clases..." size="medium" />
        </div>
      ) : classes.length === 0 ? (
        <p>No hay clases creadas aún.</p>
      ) : (
        <div className="classes-list-container">
          <div className="classes-list-column">
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
          key={editingClass?.id ?? 'new'}
          teachers={teachers}
          onSuccess={handleSaveSuccess}
          initialData={editingClass || undefined}
        />
      </Modal>

      <ConfirmModal
        isOpen={!!deletingClassId}
        title="Desactivar Clase"
        message="La clase dejará de estar activa. El historial de asistencia y las comisiones de los profesores se conservan, y podés volver a activarla cuando quieras."
        confirmText="Desactivar"
        onConfirm={confirmDeactivate}
        onCancel={() => setDeletingClassId(null)}
        isBusy={isDeactivating}
      />
    </div>
  );
}
