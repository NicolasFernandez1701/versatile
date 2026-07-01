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

export function EnrollmentFormModal({
  isOpen,
  onClose,
  onSuccess,
  classesList
}: EnrollmentFormModalProps) {
  const { showError, showSuccess } = useAlert();
  const { students } = useUsersStore();

  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentSearchText, setStudentSearchText] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [classSearchText, setClassSearchText] = useState('');
  const [reservationDate, setReservationDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showClassDropdown, setShowClassDropdown] = useState(false);

  const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  useEffect(() => {
    if (isOpen) {
      setSelectedStudent('');
      setStudentSearchText('');
      setSelectedClass('');
      setClassSearchText('');
      setReservationDate(new Date().toISOString().split('T')[0]);
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
      await enrollmentsService.enrollStudent(selectedStudent, selectedClass, reservationDate);
      showSuccess('Alumno inscripto correctamente.');
      onSuccess();
      onClose();
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'Error al inscribir alumno');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva Inscripción" maxWidth="500px">
      <form onSubmit={handleEnroll} className="standard-form">
        <div style={{ position: 'relative' }}>
          <Input
            label="Alumno"
            type="text"
            placeholder="Buscar y seleccionar alumno..."
            value={studentSearchText}
            onChange={(e) => {
              setStudentSearchText(e.target.value);
              const found = students.find((s) => s.full_name === e.target.value);
              setSelectedStudent(found ? found.id : '');
              setShowStudentDropdown(true);
            }}
            onFocus={() => setShowStudentDropdown(true)}
            onBlur={() => setTimeout(() => setShowStudentDropdown(false), 200)}
            required
            autoComplete="off"
          />
          {showStudentDropdown &&
            students.filter((s) =>
              s.full_name?.toLowerCase().includes(studentSearchText.toLowerCase())
            ).length > 0 && (
              <div className="autocomplete-dropdown">
                {students
                  .filter((s) =>
                    s.full_name?.toLowerCase().includes(studentSearchText.toLowerCase())
                  )
                  .map((s) => (
                    <div
                      key={s.id}
                      className="autocomplete-option"
                      onClick={() => {
                        setStudentSearchText(s.full_name || '');
                        setSelectedStudent(s.id);
                        setShowStudentDropdown(false);
                      }}
                    >
                      {s.full_name}
                    </div>
                  ))}
              </div>
            )}
        </div>

        <div style={{ position: 'relative' }}>
          <Input
            label="Clase"
            type="text"
            placeholder="Buscar y seleccionar clase..."
            value={classSearchText}
            onChange={(e) => {
              setClassSearchText(e.target.value);
              const found = classesList.find(
                (c) =>
                  `${c.activity_name} - ${DAYS[c.day_of_week]} ${c.start_time.substring(0, 5)} (Capacidad: ${c.capacity})` ===
                  e.target.value
              );
              setSelectedClass(found ? found.id : '');
              setShowClassDropdown(true);
            }}
            onFocus={() => setShowClassDropdown(true)}
            onBlur={() => setTimeout(() => setShowClassDropdown(false), 200)}
            required
            autoComplete="off"
          />
          {showClassDropdown &&
            classesList.filter((c) =>
              `${c.activity_name} - ${DAYS[c.day_of_week]} ${c.start_time.substring(0, 5)}`
                .toLowerCase()
                .includes(classSearchText.toLowerCase())
            ).length > 0 && (
              <div className="autocomplete-dropdown">
                {classesList
                  .filter((c) =>
                    `${c.activity_name} - ${DAYS[c.day_of_week]} ${c.start_time.substring(0, 5)}`
                      .toLowerCase()
                      .includes(classSearchText.toLowerCase())
                  )
                  .map((c) => {
                    const labelText = `${c.activity_name} - ${DAYS[c.day_of_week]} ${c.start_time.substring(0, 5)} (Capacidad: ${c.capacity})`;
                    return (
                      <div
                        key={c.id}
                        className="autocomplete-option"
                        onClick={() => {
                          setClassSearchText(labelText);
                          setSelectedClass(c.id);
                          setShowClassDropdown(false);
                        }}
                      >
                        {labelText}
                      </div>
                    );
                  })}
              </div>
            )}
        </div>

        <Input
          label="Fecha de la Reserva"
          type="date"
          value={reservationDate}
          onChange={(e) => setReservationDate(e.target.value)}
          required
        />

        <div
          className="form-actions"
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-color)',
            marginTop: '1.5rem'
          }}
        >
          <Button type="submit" variant="primary" loading={isSubmitting}>
            <Check size={20} /> {isSubmitting ? 'Inscribiendo...' : 'Inscribir'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
