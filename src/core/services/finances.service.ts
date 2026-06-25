import { supabase } from './supabase';
import { useAuthStore } from '../store/useAuthStore';
import type { PaymentEntity, RecordPaymentPayload } from '../types/finances.types';

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

  async getStudentsWithPlans(studioId: string): Promise<unknown[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, plans(*)')
      .eq('role', 'student')
      .eq('studio_id', studioId);

    if (error) throw error;
    return data;
  },

  async recordPayment(payload: RecordPaymentPayload): Promise<void> {
    const studioId = useAuthStore.getState().current_studio_id;
    if (!studioId) throw new Error('No active studio');

    const { error } = await supabase.from('payments').insert({ ...payload, studio_id: studioId });
    if (error) throw error;

    // Update the student's expiration date in their profile so the badge reflects the payment
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ plan_expiration_date: payload.expiration_date })
      .eq('id', payload.student_id);

    if (profileError) throw profileError;
  }
};
