import { supabase } from './supabase';
import type { PaymentEntity, RecordPaymentPayload } from '../types/finances.types';

export const financesService = {
  async getPayments(): Promise<PaymentEntity[]> {
    const { data, error } = await supabase
      .from('payments')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as any;
  },

  async getStudentsWithPlans(): Promise<any[]> {
    // We need students (role='student') and their linked plans
    // We also need promotion details from profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('*, plans(*)')
      .eq('role', 'student');

    if (error) throw error;
    return data;
  },

  async recordPayment(payload: RecordPaymentPayload): Promise<void> {
    const { error } = await supabase.from('payments').insert(payload);
    if (error) throw error;
  }
};
