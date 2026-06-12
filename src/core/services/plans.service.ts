import { supabase } from './supabase';
import type { PlanEntity, CreatePlanDTO, CreatePlanActivityDTO } from '../types/plans.types';

export const plansService = {
  async getPlans(): Promise<PlanEntity[]> {
    const { data, error } = await supabase
      .from('plans')
      .select('*, plan_activities(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PlanEntity[];
  },

  async createPlanWithActivities(planData: CreatePlanDTO, activities: CreatePlanActivityDTO[]): Promise<PlanEntity> {
    // Insertamos el plan principal
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .insert([planData])
      .select()
      .single();

    if (planError) throw planError;

    // Si tiene actividades, las vinculamos
    if (activities.length > 0) {
      const activitiesData = activities.map(act => ({
        ...act,
        plan_id: plan.id
      }));

      const { error: actError } = await supabase
        .from('plan_activities')
        .insert(activitiesData);

      if (actError) throw actError;
    }

    return plan as PlanEntity;
  },

  async togglePlanStatus(planId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('plans')
      .update({ is_active: isActive })
      .eq('id', planId);

    if (error) throw error;
  },

  async deletePlan(planId: string): Promise<void> {
    const { error } = await supabase
      .from('plans')
      .delete()
      .eq('id', planId);

    if (error) throw error;
  },

  async getPlanById(planId: string): Promise<PlanEntity> {
    const { data, error } = await supabase
      .from('plans')
      .select('*, plan_activities(*)')
      .eq('id', planId)
      .single();

    if (error) throw error;
    return data as PlanEntity;
  },

  async updatePlanWithActivities(planId: string, planData: CreatePlanDTO, activities: CreatePlanActivityDTO[]): Promise<void> {
    // 1. Update plan
    const { error: planError } = await supabase
      .from('plans')
      .update(planData)
      .eq('id', planId);

    if (planError) throw planError;

    // 2. Delete existing activities
    const { error: deleteError } = await supabase
      .from('plan_activities')
      .delete()
      .eq('plan_id', planId);

    if (deleteError) throw deleteError;

    // 3. Insert new activities
    if (activities.length > 0) {
      const activitiesData = activities.map(act => ({
        ...act,
        plan_id: planId
      }));

      const { error: actError } = await supabase
        .from('plan_activities')
        .insert(activitiesData);

      if (actError) throw actError;
    }
  }
};
