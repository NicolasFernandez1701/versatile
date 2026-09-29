import { X, User, Mail, Phone, Trash2 } from 'lucide-react';
import { Loader, ConfirmModal } from '@/ui';
import { useEnrolledStudentsRemoval } from '@/core/hooks/admin/useEnrolledStudentsRemoval';
import type { EnrolledStudentsModalProps } from './EnrolledStudentsModal.types';
import './EnrolledStudentsModal.css';

export function EnrolledStudentsModal({
  title,
  isOpen,
  onClose,
  students,
  isLoading,
  onStudentRemoved
}: EnrolledStudentsModalProps) {
  const {
    removingId,
    studentToCancel,
    requestRemove,
    cancelRemove,
    confirmRemove,
  } = useEnrolledStudentsRemoval(onStudentRemoved);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
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
            <p className="enrolled-empty">
              No hay alumnos inscriptos.
            </p>
          ) : (
            students.map((enroll) => {
              const profile = enroll.profiles;
              if (!profile) return null;

              return (
                <div
                  key={enroll.id}
                  className="student-row enrolled-student-row"
                >
                  <div className="enrolled-student-main">
                    <div className="student-avatar">
                      <User size={20} />
                    </div>
                    <div className="student-info">
                      <h4
                        className="enrolled-student-name"
                      >
                        {profile.full_name}
                        {enroll.attendance_status === 'attended' && (
                          <span
                            className="badge badge-active enrolled-badge"
                          >
                            Presente
                          </span>
                        )}
                        {enroll.attendance_status === 'absent' && (
                          <span
                            className="badge badge-inactive enrolled-badge"
                          >
                            Ausente
                          </span>
                        )}
                        {enroll.attendance_status === 'pending' && (
                          <span
                            className="badge badge-pending enrolled-badge"
                          >
                            Pendiente
                          </span>
                        )}
                      </h4>
                      {profile.email && (
                        <p className="enrolled-contact">
                          <Mail size={12} /> {profile.email}
                        </p>
                      )}
                      {profile.phone && (
                        <p className="enrolled-contact">
                          <Phone size={12} /> {profile.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    className="icon-btn text-danger"
                    onClick={() => requestRemove(enroll.id)}
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
        onConfirm={confirmRemove}
        onCancel={cancelRemove}
      />
    </div>
  );
}
