import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { enrollmentsService } from '@/core/services';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import { Modal, Input, Button } from '@/components/ui';
import { useUsersStore } from '@/core/store/useUsersStore';
import type { ClassEntity } from '@/core/types/classes.types';

interface EnrollmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classesList: ClassEntity[];
}

export function EnrollmentFormModal({ isOpen, onClose, onSuccess, classesList }: EnrollmentFormModalProps) {
  const { showError, showSuccess } = useAlert();
  const { students } = useUsersStore();

  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentSearchText, setStudentSearchText] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [classSearchText, setClassSearchText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  useEffect(() => {
    if (isOpen) {
      setSelectedStudent('');
      setStudentSearchText('');
      setSelectedClass('');
      setClassSearchText('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      showError('Por favor selecciona un alumno válido de la lista.');
      return;
    }
    if (!selectedClass) {
      showError('Por favor selecciona una clase válida de la lista.');
      return;
    }

    setIsSubmitting(true);
    try {
      await enrollmentsService.enrollStudent(selectedStudent, selectedClass);
      showSuccess('Alumno inscripto correctamente.');
      onSuccess();
      onClose();
    } catch (error: any) {
      showError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nueva Inscripción"
      maxWidth="500px"
    >
      <form onSubmit={handleEnroll} className="standard-form">
        <div style={{ position: 'relative' }}>
          <Input
            label="Alumno"
            list="enrollments-students-list-modal"
            type="text"
            placeholder="Seleccionar alumno..."
            value={studentSearchText}
            onChange={e => {
              setStudentSearchText(e.target.value);
              const found = students.find(s => s.full_name === e.target.value);
              setSelectedStudent(found ? found.id : '');
            }}
            required
          />
          <datalist id="enrollments-students-list-modal">
            {students.map(s => <option key={s.id} value={s.full_name || ''} />)}
          </datalist>
        </div>

        <div style={{ position: 'relative' }}>
          <Input
            label="Clase"
            list="enrollments-classes-list-modal"
            type="text"
            placeholder="Seleccionar clase..."
            value={classSearchText}
            onChange={e => {
              setClassSearchText(e.target.value);
              const found = classesList.find(c => `${c.activity_name} - ${DAYS[c.day_of_week]} ${c.start_time.substring(0, 5)} (Capacidad: ${c.capacity})` === e.target.value);
              setSelectedClass(found ? found.id : '');
            }}
            required
          />
          <datalist id="enrollments-classes-list-modal">
            {classesList.map(c => (
              <option key={c.id} value={`${c.activity_name} - ${DAYS[c.day_of_week]} ${c.start_time.substring(0, 5)} (Capacidad: ${c.capacity})`} />
            ))}
          </datalist>
        </div>

        <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', marginTop: '1.5rem' }}>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            <Check size={20} /> {isSubmitting ? 'Inscribiendo...' : 'Inscribir'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
