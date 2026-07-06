import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { useEnrollmentForm } from '@/core/hooks/useEnrollmentForm';
import { Modal, Input, Button } from '@/ui';

interface EnrollmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  studioId: string;
}

export function EnrollmentFormModal({
  isOpen,
  onClose,
  onSuccess,
  studioId,
}: EnrollmentFormModalProps) {
  const {
    query,
    results,
    studentDropdownOpen,
    classDropdownOpen,
    classes,
    loading,
    error,
    reservationDate,
    searchStudents,
    selectStudent,
    selectClass,
    setSelectedClass,
    setStudentDropdownOpen,
    setClassDropdownOpen,
    setReservationDate,
    handleSubmit,
  } = useEnrollmentForm({ studioId, onSuccess });

  const [classSearchText, setClassSearchText] = useState('');

  const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const filteredClasses = classes.filter((c) =>
    `${c.activity_name} - ${DAYS[c.day_of_week]} ${c.start_time.substring(0, 5)}`
      .toLowerCase()
      .includes(classSearchText.toLowerCase())
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSubmit();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nueva Inscripción" maxWidth="500px">
      <form onSubmit={onSubmit} className="standard-form">
        <div style={{ position: 'relative' }}>
          <Input
            label="Alumno"
            type="text"
            placeholder="Buscar y seleccionar alumno..."
            value={query}
            onChange={(e) => searchStudents(e.target.value)}
            onFocus={() => setStudentDropdownOpen(true)}
            onBlur={() => setTimeout(() => setStudentDropdownOpen(false), 200)}
            required
            autoComplete="off"
          />
          {studentDropdownOpen &&
            results.filter((s) =>
              s.full_name?.toLowerCase().includes(query.toLowerCase())
            ).length > 0 && (
              <div className="autocomplete-dropdown">
                {results
                  .filter((s) => s.full_name?.toLowerCase().includes(query.toLowerCase()))
                  .map((s) => (
                    <div
                      key={s.id}
                      className="autocomplete-option"
                      onClick={() => {
                        selectStudent(s);
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
              const found = classes.find(
                (c) =>
                  `${c.activity_name} - ${DAYS[c.day_of_week]} ${c.start_time.substring(0, 5)} (Capacidad: ${c.capacity})` ===
                  e.target.value
              );
              setSelectedClass(found ? found.id : '');
              setClassDropdownOpen(true);
            }}
            onFocus={() => setClassDropdownOpen(true)}
            onBlur={() => setTimeout(() => setClassDropdownOpen(false), 200)}
            required
            autoComplete="off"
          />
          {classDropdownOpen && filteredClasses.length > 0 && (
            <div className="autocomplete-dropdown">
              {filteredClasses.map((c) => {
                const labelText = `${c.activity_name} - ${DAYS[c.day_of_week]} ${c.start_time.substring(0, 5)} (Capacidad: ${c.capacity})`;
                return (
                  <div
                    key={c.id}
                    className="autocomplete-option"
                    onClick={() => {
                      setClassSearchText(labelText);
                      selectClass(c);
                      setClassDropdownOpen(false);
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

        {error && <div className="error-message">{error}</div>}

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
          <Button type="submit" variant="primary" loading={loading}>
            <Check size={20} /> {loading ? 'Inscribiendo...' : 'Inscribir'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
