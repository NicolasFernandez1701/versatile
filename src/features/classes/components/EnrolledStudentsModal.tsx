import { X, User, Mail, Phone } from 'lucide-react';
import type { EnrollmentEntity } from '@/core/types/classes.types';
import { Modal, Loader } from '@/components/ui';

interface Props {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  students: EnrollmentEntity[];
  isLoading: boolean;
}

export function EnrolledStudentsModal({ title, isOpen, onClose, students, isLoading }: Props) {
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
                <div key={enroll.id} className="student-row">
                  <div className="student-avatar">
                    <User size={20} />
                  </div>
                  <div className="student-info">
                    <h4>{profile.full_name}</h4>
                    {profile.email && <p><Mail size={12} /> {profile.email}</p>}
                    {profile.phone && <p><Phone size={12} /> {profile.phone}</p>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
