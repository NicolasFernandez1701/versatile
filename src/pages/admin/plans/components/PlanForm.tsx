import { Plus, Trash2, Calculator } from 'lucide-react';
import { usePlanForm } from '@/core/hooks/shared/usePlanForm';
import type { PlanFormProps } from './PlanForm.types';
import './PlanForm.css';

export function PlanForm({
  initialData,
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
              <div className="plan-activity-icon-wrap">
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
              <span className="plan-activity-unit">clases/sem</span>

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
          className="btn-secondary plan-add-activity-btn"
          onClick={addActivity}
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
          <div className="plan-price-row">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Valor final del plan"
              value={price}
              onChange={(e) => setField('price', e.target.value)}
              required
              className="plan-price-input"
            />
            <button
              type="button"
              className="btn-secondary plan-calc-btn"
              onClick={calculateSuggestedPrice}
              title="Calcular Sugerido"
            >
              <Calculator size={20} />
            </button>
          </div>
          <small className="text-secondary plan-hint">
            Precio sugerido: {classesPerWeek} clases x $2000
          </small>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="plan-form-footer">
        <div className="form-group checkbox-group plan-footer-group">
          <label className="plan-footer-label">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setField('isActive', e.target.checked)}
            />
            Plan Activo
          </label>
        </div>

        <div className="form-actions plan-footer-actions">
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
