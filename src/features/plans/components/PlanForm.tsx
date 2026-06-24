import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { useAlert } from '@/core/components/GlobalAlertProvider';
import type { ClassEntity } from '@/core/types/classes.types';
import type { PlanEntity } from '@/core/types/plans.types';

interface PlanFormProps {
  initialData?: PlanEntity | null;
  availableClasses: ClassEntity[];
  onSubmit: (
    data: {
      name: string;
      price: number;
      classes_per_week: number;
      is_active: boolean;
    },
    activities: { activity_name: string; classes_per_week: number }[]
  ) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function PlanForm({
  initialData,
  availableClasses,
  onSubmit,
  onCancel,
  loading
}: PlanFormProps) {
  const { showError } = useAlert();
  const [name, setName] = useState(initialData?.name || '');
  const [price, setPrice] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [activities, setActivities] = useState<
    { activity_name: string; classes_per_week: number | string }[]
  >([]);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPrice(initialData.price.toString());
      setIsActive(initialData.is_active ?? true);
      if (initialData.plan_activities) {
        setActivities(
          initialData.plan_activities.map((a) => ({
            activity_name: a.activity_name,
            classes_per_week: a.classes_per_week
          }))
        );
      }
    } else {
      setName('');
      setPrice('');
      setIsActive(true);
      setActivities([]);
    }
  }, [initialData]);

  const activityCatalog = useMemo(() => {
    const catalog = new Map<string, number>();
    availableClasses.forEach((c) => {
      if (!catalog.has(c.activity_name)) {
        catalog.set(c.activity_name, Number(c.base_price));
      }
    });
    return catalog;
  }, [availableClasses]);

  const addActivity = () => {
    setActivities([...activities, { activity_name: '', classes_per_week: 1 }]);
  };

  const removeActivity = (index: number) => {
    const newActs = [...activities];
    newActs.splice(index, 1);
    setActivities(newActs);
  };

  const updateActivity = (index: number, field: string, value: string | number) => {
    const newActs = [...activities];
    newActs[index] = { ...newActs[index], [field]: value };
    setActivities(newActs);
  };

  const totalClassesPerWeek = activities.reduce(
    (sum, act) => sum + Number(act.classes_per_week || 0),
    0
  );

  const calculateSuggestedPrice = () => {
    let suggested = 0;
    activities.forEach((act) => {
      const basePrice = activityCatalog.get(act.activity_name) || 0;
      suggested += basePrice * act.classes_per_week * 4;
    });
    setPrice(suggested.toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validActivities = activities.filter((a) => a.activity_name.trim() !== '');

    if (!name || !price || validActivities.length === 0) {
      showError('Completá el nombre, el precio y al menos seleccioná una actividad válida.');
      return;
    }

    const invalidActivities = validActivities.filter((a) => !activityCatalog.has(a.activity_name));
    if (invalidActivities.length > 0) {
      showError(
        `La actividad "${invalidActivities[0].activity_name}" no existe. Solo podés seleccionar actividades pre-cargadas de la lista.`
      );
      return;
    }

    await onSubmit(
      {
        name,
        price: Number(price.replace(/\./g, '').replace(/,/g, '.')),
        classes_per_week: totalClassesPerWeek,
        is_active: isActive
      },
      validActivities
    );
  };

  return (
    <form onSubmit={handleSubmit} className="standard-form">
      <div className="form-group">
        <label>Nombre del Plan</label>
        <input
          type="text"
          placeholder="Ej: Intermedio A"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label>Composición de Actividades</label>
        <div className="activities-list">
          {activities.map((act, idx) => (
            <div key={idx} className="activity-row">
              <div style={{ position: 'relative' }}>
                <select
                  value={act.activity_name}
                  onChange={(e) => updateActivity(idx, 'activity_name', e.target.value)}
                  required
                >
                  <option value="" disabled>
                    Seleccionar actividad...
                  </option>
                  {Array.from(activityCatalog.keys()).map((actName) => (
                    <option key={actName} value={actName}>
                      {actName}
                    </option>
                  ))}
                </select>
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
          <input type="number" value={totalClassesPerWeek} disabled />
        </div>

        <div className="form-group">
          <label>Precio Mensual ($)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Valor final del plan"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
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
            Precio sugerido: suma de precios base x 4
          </small>
        </div>
      </div>

      <div className="plan-form-footer">
        <div className="form-group checkbox-group" style={{ margin: 0 }}>
          <label style={{ margin: 0 }}>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
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
