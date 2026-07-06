import { Plus, Trash2, Calculator } from 'lucide-react';
import { usePlanForm } from '@/core/hooks/shared/usePlanForm';
import type { ClassEntity } from '@/core/types/classes.types';
import type { PlanEntity } from '@/core/types/plans.types';

interface PlanFormProps {
  initialData?: PlanEntity | null;
  availableClasses: ClassEntity[];
  onSuccess?: () => void;
  onCancel: () => void;
}

export function PlanForm({
  initialData,
  availableClasses: _availableClasses,
  onSuccess,
  onCancel,
}: PlanFormProps) {
  const {
    name,
    price,
    classesPerWeek,
    isActive,
    activities,
    loading,
    error,
    setField,
    addActivity,
    removeActivity,
    updateActivity,
    calculateSuggestedPrice,
    handleSubmit,
  } = usePlanForm({ initialData, onSuccess });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  return (
    <form onSubmit={onSubmit} className="standard-form">
      <div className="form-group">
        <label>Nombre del Plan</label>
        <input
          type="text"
          placeholder="Ej: Intermedio A"
          value={name}
          onChange={(e) => setField('name', e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label>Composición de Actividades</label>
        <div className="activities-list">
          {activities.map((act, idx) => (
            <div key={idx} className="activity-row">
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Ej: Yoga"
                  value={act.activity_name}
                  onChange={(e) => updateActivity(idx, 'activity_name', e.target.value)}
                  required
                />
              </div>

              <input
                type="number"
                min="1"
                value={act.classes_per_week}
                onChange={(e) =>
                  updateActivity(
                    idx,
                    'classes_per_week',
                    e.target.value === '' ? '' : Number(e.target.value)
                  )
                }
                required
              />
              <span style={{ alignSelf: 'center' }}>clases/sem</span>

              <button
                type="button"
                className="icon-btn text-danger"
                onClick={() => removeActivity(idx)}
              >
                <Trash2 size={20} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={addActivity}
          style={{ marginTop: '10px' }}
        >
          <Plus size={16} /> Agregar Actividad
        </button>
      </div>

      <div className="plan-form-row">
        <div className="form-group">
          <label>Total Clases Semanales</label>
          <input type="number" value={classesPerWeek} disabled />
        </div>

        <div className="form-group">
          <label>Precio Mensual ($)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Valor final del plan"
              value={price}
              onChange={(e) => setField('price', e.target.value)}
              required
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={calculateSuggestedPrice}
              title="Calcular Sugerido"
              style={{ padding: '0 0.75rem' }}
            >
              <Calculator size={20} />
            </button>
          </div>
          <small className="text-secondary" style={{ display: 'block', marginTop: '0.25rem' }}>
            Precio sugerido: {classesPerWeek} clases x $2000
          </small>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="plan-form-footer">
        <div className="form-group checkbox-group" style={{ margin: 0 }}>
          <label style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setField('isActive', e.target.checked)}
            />
            Plan Activo
          </label>
        </div>

        <div className="form-actions" style={{ marginTop: 0 }}>
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar Plan'}
          </button>
        </div>
      </div>
    </form>
  );
}
