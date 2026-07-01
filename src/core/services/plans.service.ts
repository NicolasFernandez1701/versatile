import { supabase } from './supabase';
import { useAuthStore } from '../store/useAuthStore';
import type { PlanEntity, PlanWithActivities, CreatePlanDTO, CreatePlanActivityDTO, PlanChange } from '../types/plans.types';

export type { PlanChange };

export const plansService = {
  async getPlans(): Promise<PlanEntity[]> {
    const { data, error } = await supabase
      .from('plans')
      .select('*, plan_activities(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PlanEntity[];
  },

  async getActivePlans(): Promise<PlanEntity[]> {
    const { data, error } = await supabase
      .from('plans')
      .select('*, plan_activities(*)')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) throw error;
    return data as PlanEntity[];
  },

  async createPlanWithActivities(
    planData: CreatePlanDTO,
    activities: CreatePlanActivityDTO[]
  ): Promise<PlanEntity> {
    const studioId = useAuthStore.getState().current_studio_id;

    // Insertamos el plan principal con studio_id
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .insert([{ ...planData, studio_id: studioId }])
      .select()
      .single();

    if (planError) throw planError;

    // Si tiene actividades, las vinculamos con studio_id
    if (activities.length > 0) {
      const activitiesData = activities.map((act) => ({
        ...act,
        plan_id: plan.id,
        studio_id: studioId
      }));

      const { error: actError } = await supabase.from('plan_activities').insert(activitiesData);

      if (actError) throw actError;
    }

    return plan as PlanEntity;
  },

  async togglePlanStatus(planId: string, isActive: boolean): Promise<void> {
    const { error } = await supabase.from('plans').update({ is_active: isActive }).eq('id', planId);

    if (error) throw error;
  },

  async deletePlan(planId: string): Promise<void> {
    const { error } = await supabase.from('plans').delete().eq('id', planId);

    if (error) throw error;
  },

  async getPlanById(planId: string): Promise<PlanWithActivities> {
    const { data, error } = await supabase
      .from('plans')
      .select('*, plan_activities(*)')
      .eq('id', planId)
      .single();

    if (error) throw error;
    return data as PlanWithActivities;
  },

  async updatePlanWithActivities(
    planId: string,
    planData: CreatePlanDTO,
    activities: CreatePlanActivityDTO[]
  ): Promise<void> {
    // 1. Update plan
    const { error: planError } = await supabase.from('plans').update(planData).eq('id', planId);

    if (planError) throw planError;

    // 2. Delete existing activities
    const { error: deleteError } = await supabase
      .from('plan_activities')
      .delete()
      .eq('plan_id', planId);

    if (deleteError) throw deleteError;

    // 3. Insert new activities with studio_id
    if (activities.length > 0) {
      const studioId = useAuthStore.getState().current_studio_id;
      const activitiesData = activities.map((act) => ({
        ...act,
        plan_id: planId,
        studio_id: studioId
      }));

      const { error: actError } = await supabase.from('plan_activities').insert(activitiesData);

      if (actError) throw actError;
    }
  }
};
