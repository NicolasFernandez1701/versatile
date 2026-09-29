import type { ClassEntity } from '@/core/types/classes.types';
import type { PlanEntity } from '@/core/types/plans.types';

export interface PlanFormProps {
  initialData?: PlanEntity | null;
  availableClasses: ClassEntity[];
  onSuccess?: () => void;
  onCancel: () => void;
}
