import { Clock, Users, Edit2, Trash2 } from 'lucide-react';
import type { ClassEntity } from '@/core/types/classes.types';

interface Props {
  cls: ClassEntity;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onClick: (cls: ClassEntity) => void;
}

const getDayName = (day: number) => {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[day];
};

export function ClassCard({ cls, onDelete, onEdit, onClick }: Props) {
  const enrolledCount = cls.enrollments?.[0]?.count || 0;

  return (
    <div className="class-card" onClick={() => onClick(cls)}>
      <div className="class-header">
        <h3 className="class-title">{cls.activity_name}</h3>
        <div className="class-actions">
          <button
            className="action-btn edit"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(cls.id);
            }}
          >
            <Edit2 size={18} />
          </button>
          <button
            className="action-btn delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(cls.id);
            }}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <p className="class-teacher">Prof: {cls.profiles?.full_name || 'Sin asignar'}</p>

      <div className="class-details">
        <div className="detail-item">
          <Clock size={16} />
          <span>
            {getDayName(cls.day_of_week)} {cls.start_time.slice(0, 5)}
          </span>
        </div>
        <div className="detail-item">
          <Users size={16} />
          <span>
            {enrolledCount} / {cls.capacity} cupos
          </span>
        </div>
      </div>

      <div className="commission-tag">Comisión: {cls.teacher_commission_pct}%</div>
    </div>
  );
}
