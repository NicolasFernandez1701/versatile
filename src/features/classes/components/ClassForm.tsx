import { useState, useEffect } from 'react';
import type { ClassEntity, Profile } from '@/core/types/classes.types';
import { usersService } from '@/core/services';
import { isTimeRangeValid } from '@/core/utils/validation';

interface Props {
  teachers: Profile[];
  onSubmit: (payload: Partial<ClassEntity>) => Promise<void>;
  loading: boolean;
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

export function ClassForm({ teachers, onSubmit, loading, initialData }: Props) {
  const [specialties, setSpecialties] = useState<{ id: string; name: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [timeError, setTimeError] = useState('');
  const [formData, setFormData] = useState({
    activity_name: initialData?.activity_name || '',
    teacher_id: initialData?.teacher_id || '',
    day_of_week: initialData?.day_of_week ?? 1,
    start_time: initialData?.start_time || '18:00',
    end_time: initialData?.end_time || '19:00',
    capacity: initialData?.capacity || 15,
    base_price: initialData?.base_price || 5000,
    teacher_commission_pct: initialData?.teacher_commission_pct || 50
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        activity_name: initialData.activity_name || '',
        teacher_id: initialData.teacher_id || '',
        day_of_week: initialData.day_of_week ?? 1,
        start_time: initialData.start_time || '18:00',
        end_time: initialData.end_time || '19:00',
        capacity: initialData.capacity || 15,
        base_price: initialData.base_price || 5000,
        teacher_commission_pct: initialData.teacher_commission_pct || 50
      });
    }
  }, [initialData]);

  useEffect(() => {
    usersService.getSpecialties().then(setSpecialties).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTimeError('');

    if (!isTimeRangeValid(formData.start_time, formData.end_time)) {
      setTimeError('La hora de fin debe ser posterior a la de inicio.');
      return;
    }

    await onSubmit(formData);
  };

  return (
    <form className="class-form" onSubmit={handleSubmit}>
      <div className="form-group" style={{ position: 'relative' }}>
        <label>Actividad</label>
        <input
          type="text"
          placeholder="Ej: Funcional, Yoga"
          required
          value={formData.activity_name}
          onChange={(e) => setFormData({ ...formData, activity_name: e.target.value })}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        />

        {showDropdown &&
          specialties.filter((s) =>
            s.name.toLowerCase().includes(formData.activity_name.toLowerCase())
          ).length > 0 && (
            <div className="autocomplete-dropdown">
              {specialties
                .filter((s) => s.name.toLowerCase().includes(formData.activity_name.toLowerCase()))
                .map((s) => (
                  <div
                    key={s.id}
                    className="autocomplete-option"
                    onClick={() => {
                      setFormData({ ...formData, activity_name: s.name });
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
            value={formData.teacher_id}
            onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
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
            value={formData.day_of_week}
            onChange={(e) => setFormData({ ...formData, day_of_week: parseInt(e.target.value) })}
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
            value={formData.start_time}
            onChange={(e) => {
              setFormData({ ...formData, start_time: e.target.value });
              if (timeError) setTimeError('');
            }}
          />
        </div>
        <div className="form-group">
          <label>Fin (HH:MM)</label>
          <input
            type="time"
            required
            value={formData.end_time}
            onChange={(e) => {
              setFormData({ ...formData, end_time: e.target.value });
              if (timeError) setTimeError('');
            }}
          />
        </div>
      </div>
      {timeError && <div className="error-message">{timeError}</div>}

      <div className="form-group">
        <label>Capacidad</label>
        <input
          type="number"
          required
          min="1"
          value={formData.capacity}
          onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
        />
      </div>

      <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="form-group">
          <label>Precio Base ($)</label>
          <input
            type="number"
            required
            value={formData.base_price}
            onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) })}
          />
        </div>
        <div className="form-group">
          <label>Comisión Profesora (%)</label>
          <input
            type="number"
            required
            min="0"
            max="100"
            value={formData.teacher_commission_pct}
            onChange={(e) =>
              setFormData({ ...formData, teacher_commission_pct: parseFloat(e.target.value) })
            }
          />
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar Clase'}
      </button>
    </form>
  );
}
