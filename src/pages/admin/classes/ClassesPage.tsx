import { useEffect, useState } from 'react';

import { Plus } from 'lucide-react';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import { classesService } from '@/core/services';
import type { ClassEntity, EnrollmentEntity, Profile } from '@/core/types/classes.types';
import { ClassCard } from '@/features/classes/components/ClassCard';
import { ClassForm } from '@/features/classes/components/ClassForm';
import { EnrolledStudentsModal } from '@/features/classes/components/EnrolledStudentsModal';
import { Modal, ConfirmModal, Loader } from '@/components/ui';
import '../../../features/classes/styles/classes.css';

export function ClassesPage() {
  const { showError, showSuccess } = useAlert();
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for viewing students
  const [viewingStudentsClass, setViewingStudentsClass] = useState<ClassEntity | null>(null);
  const [students, setStudents] = useState<EnrollmentEntity[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Modal State for Class Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassEntity | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal State for Confirm Delete
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const data = await classesService.getClasses();
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    classesService.getTeachers().then(setTeachers).catch(console.error);
  }, []);

  const handleDeleteClick = (id: string) => {
    setDeletingClassId(id);
  };

  const confirmDelete = async () => {
    if (!deletingClassId) return;
    try {
      await classesService.deleteClass(deletingClassId);
      fetchClasses();
      showSuccess('Clase eliminada con éxito.');
    } catch (error) {
      showError('Error eliminando la clase');
    } finally {
      setDeletingClassId(null);
    }
  };

  const openStudentsModal = async (cls: ClassEntity) => {
    setViewingStudentsClass(cls);
    setLoadingStudents(true);
    try {
      const data = await classesService.getEnrolledStudents(cls.id);
      setStudents(data);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoadingStudents(false);
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

  const handleSaveClass = async (payload: Partial<ClassEntity>) => {
    try {
      setSaving(true);
      if (editingClass) {
        await classesService.updateClass(editingClass.id, payload);
      } else {
        await classesService.createClass(payload);
      }
      await fetchClasses();
      closeFormModal();
      showSuccess('Clase guardada exitosamente.');
    } catch (error: any) {
      showError(error.message || 'Error guardando la clase');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 4rem)', overflow: 'hidden' }}>
      <div className="page-header">
        <div>
          <h1>Clases</h1>
          <p className="text-secondary">Gestión de clases y horarios</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => openFormModal()}
          title="Nueva Clase"
        >
          <Plus size={20} />
          <span>Nueva Clase</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '2rem' }}><Loader text="Cargando clases..." size="medium" /></div>
      ) : classes.length === 0 ? (
        <p>No hay clases creadas aún.</p>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '2rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {classes.map(cls => (
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
        onClose={() => setViewingStudentsClass(null)}
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
          onSubmit={handleSaveClass} 
          loading={saving} 
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
