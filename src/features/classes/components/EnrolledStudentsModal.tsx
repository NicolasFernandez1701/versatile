import { X, User, Mail, Phone, Trash2 } from 'lucide-react';
import type { EnrollmentEntity } from '@/core/types/classes.types';
import { Modal, Loader, ConfirmModal } from '@/components/ui';
import { classesService } from '@/core/services';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import { useState } from 'react';

interface Props {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  students: EnrollmentEntity[];
  isLoading: boolean;
  onStudentRemoved?: () => void;
}

export function EnrolledStudentsModal({ title, isOpen, onClose, students, isLoading, onStudentRemoved }: Props) {
  const { showSuccess, showError } = useAlert();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [studentToCancel, setStudentToCancel] = useState<string | null>(null);

  const handleConfirmRemove = async () => {
    if (!studentToCancel) return;
    
    setRemovingId(studentToCancel);
    try {
      await classesService.cancelEnrollment(studentToCancel);
      showSuccess('Alumno dado de baja correctamente.');
      if (onStudentRemoved) onStudentRemoved();
    } catch (error) {
      console.error(error);
      showError('No se pudo dar de baja al alumno.');
    } finally {
      setRemovingId(null);
      setStudentToCancel(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title} - Alumnos</h2>
          <button className="action-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          {isLoading ? (
            <Loader text="Cargando alumnos..." size="medium" />
          ) : students.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>No hay alumnos inscriptos.</p>
          ) : (
            students.map(enroll => {
              const profile = enroll.profiles;
              if (!profile) return null;

              return (
                <div key={enroll.id} className="student-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div className="student-avatar">
                      <User size={20} />
                    </div>
                    <div className="student-info">
                      <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {profile.full_name}
                        {enroll.attendance_status === 'attended' && <span className="badge badge-active" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>Presente</span>}
                        {enroll.attendance_status === 'absent' && <span className="badge badge-inactive" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>Ausente</span>}
                        {enroll.attendance_status === 'pending' && <span className="badge badge-pending" style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>Pendiente</span>}
                      </h4>
                      {profile.email && <p style={{ margin: 0, fontSize: '0.85rem' }}><Mail size={12} /> {profile.email}</p>}
                      {profile.phone && <p style={{ margin: 0, fontSize: '0.85rem' }}><Phone size={12} /> {profile.phone}</p>}
                    </div>
                  </div>
                  
                  <button 
                    className="icon-btn text-danger" 
                    onClick={() => setStudentToCancel(enroll.id)}
                    disabled={removingId === enroll.id}
                    title="Dar de baja de esta clase"
                  >
                    {removingId === enroll.id ? <Loader size="small" /> : <Trash2 size={18} />}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!studentToCancel}
        title="Cancelar Asistencia"
        message="¿Estás seguro de que deseás dar de baja a este alumno de la clase? Se liberará un cupo automáticamente."
        confirmText="Dar de baja"
        cancelText="Volver"
        isDestructive={true}
        onConfirm={handleConfirmRemove}
        onCancel={() => setStudentToCancel(null)}
      />
    </div>
  );
}
