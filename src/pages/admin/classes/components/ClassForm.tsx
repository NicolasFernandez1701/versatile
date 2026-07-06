import { useState } from 'react';
import type { ClassEntity, Profile } from '@/core/types/classes.types';
import { useClassForm } from '@/core/hooks/shared/useClassForm';

interface Props {
  teachers: Profile[];
  onSuccess?: () => void;
  initialData?: Partial<ClassEntity>;
}

const days = [
  { label: 'Domingo', value: 0 },
  { label: 'Lunes', value: 1 },
  { label: 'Martes', value: 2 },
  { label: 'Miércoles', value: 3 },
  { label: 'Jueves', value: 4 },
  { label: 'Viernes', value: 5 },
  { label: 'Sábado', value: 6 }
];

export function ClassForm({ teachers, onSuccess, initialData }: Props) {
  const {
    activityName,
    dayOfWeek,
    startTime,
    endTime,
    teacher,
    maxCapacity,
    basePrice,
    teacherCommission,
    specialties,
    loading,
    error,
    setField,
    handleSubmit,
  } = useClassForm({ initialData, onSuccess });

  const [showDropdown, setShowDropdown] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  return (
    <form className="class-form" onSubmit={onSubmit}>
      <div className="form-group" style={{ position: 'relative' }}>
        <label>Actividad</label>
        <input
          type="text"
          placeholder="Ej: Funcional, Yoga"
          required
          value={activityName}
          onChange={(e) => setField('activityName', e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        />

        {showDropdown &&
          specialties.filter((s) =>
            s.name.toLowerCase().includes(activityName.toLowerCase())
          ).length > 0 && (
            <div className="autocomplete-dropdown">
              {specialties
                .filter((s) => s.name.toLowerCase().includes(activityName.toLowerCase()))
                .map((s) => (
                  <div
                    key={s.id}
                    className="autocomplete-option"
                    onClick={() => {
                      setField('activityName', s.name);
                      setShowDropdown(false);
                    }}
                  >
                    {s.name}
                  </div>
                ))}
            </div>
          )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Profesora</label>
          <select
            required
            value={teacher}
            onChange={(e) => setField('teacher', e.target.value)}
          >
            <option value="">Seleccionar Profesora</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Día</label>
          <select
            value={dayOfWeek}
            onChange={(e) => setField('dayOfWeek', Number(e.target.value))}
          >
            {days.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="form-group">
          <label>Inicio (HH:MM)</label>
          <input
            type="time"
            required
            value={startTime}
            onChange={(e) => {
              setField('startTime', e.target.value);
            }}
          />
        </div>
        <div className="form-group">
          <label>Fin (HH:MM)</label>
          <input
            type="time"
            required
            value={endTime}
            onChange={(e) => {
              setField('endTime', e.target.value);
            }}
          />
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}

      <div className="form-group">
        <label>Capacidad</label>
        <input
          type="number"
          required
          min="1"
          value={maxCapacity}
          onChange={(e) => setField('maxCapacity', Number(e.target.value))}
        />
      </div>

      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="form-group">
          <label>Precio Base ($)</label>
          <input
            type="number"
            required
            value={basePrice}
            onChange={(e) => setField('basePrice', Number(e.target.value))}
          />
        </div>
        <div className="form-group">
          <label>Comisión Profesora (%)</label>
          <input
            type="number"
            required
            min="0"
            max="100"
            value={teacherCommission}
            onChange={(e) => setField('teacherCommission', Number(e.target.value))}
          />
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar Clase'}
      </button>
    </form>
  );
}
