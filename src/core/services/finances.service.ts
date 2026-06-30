import { supabase } from './supabase';
import { useAuthStore } from '../store/useAuthStore';
import type { PaymentEntity, RecordPaymentPayload, StudentWithPlan } from '../types/finances.types';

export const financesService = {
  async getPayments(studioId: string): Promise<PaymentEntity[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*, profiles(full_name, email)')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PaymentEntity[];
  },

  async getStudentsWithPlans(studioId: string): Promise<StudentWithPlan[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, plans(*)')
      .eq('role', 'student')
      .eq('studio_id', studioId);

    if (error) throw error;
    return data as StudentWithPlan[];
  },

  async hasExistingPayments(studentId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId);

    if (error) throw error;
    return (count ?? 0) > 0;
  },

  async recordPayment(payload: RecordPaymentPayload): Promise<void> {
    const studioId = useAuthStore.getState().current_studio_id;
    const currentUser = useAuthStore.getState().user;
    if (!studioId) throw new Error('No active studio');

    const { data: paymentData, error } = await supabase
      .from('payments')
      .insert({ ...payload, studio_id: studioId })
      .select('id')
      .single();
    if (error) throw error;

    // Update the student's expiration date in their profile so the badge reflects the payment
    let profileUpdate: { plan_expiration_date: string; plan_id?: string } = {
      plan_expiration_date: payload.expiration_date,
    };

    if (payload.planChange) {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('plan_id')
          .eq('id', payload.planChange.studentId)
          .single();

        if (profileError) throw profileError;

        const { error: planChangeError } = await supabase.from('plan_changes').insert({
          profile_id: payload.planChange.studentId,
          old_plan_id: profileData?.plan_id ?? null,
          new_plan_id: payload.planChange.newPlanId,
          changed_by: currentUser?.id ?? payload.student_id,
          payment_id: paymentData?.id ?? null,
        });

        if (planChangeError) throw planChangeError;

        profileUpdate = { ...profileUpdate, plan_id: payload.planChange.newPlanId };
      } catch (planChangeError) {
        // Payment is already committed; log the error so support can reconcile manually
        console.error(planChangeError instanceof Error ? planChangeError : new Error(String(planChangeError)));
      }
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', payload.student_id);

    if (profileError) throw profileError;
  }
};
