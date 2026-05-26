import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import VersatileHeader from '../../components/VersatileHeader';
import { supabase } from '../../api/supabaseClient';
import { CreditCard, Calendar as CalendarIcon, CheckCircle } from 'lucide-react-native';

const StudentDashboard = () => {
  const [membership, setMembership] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch latest payment/membership
    const { data: paymentData } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', user.id)
      .order('expiration_date', { ascending: false })
      .limit(1);

    if (paymentData?.[0]) setMembership(paymentData[0]);

    // Fetch enrollments
    const { data: enrollmentData } = await supabase
      .from('enrollments')
      .select('*, classes(*, activities(name))')
      .eq('student_id', user.id);

    if (enrollmentData) setClasses(enrollmentData);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <VersatileHeader />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Plan</Text>
          <View style={styles.planCard}>
            <View style={styles.planInfo}>
              <CreditCard color={COLORS.primary} size={24} />
              <View style={styles.planTextContainer}>
                <Text style={styles.planName}>{membership?.plan_details || 'Sin Plan Activo'}</Text>
                <Text style={styles.planDate}>Vence el: {membership?.expiration_date || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{membership ? 'Al Día' : 'Pendiente'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mis Clases</Text>
          {classes.length > 0 ? (
            classes.map((item) => (
              <View key={item.id} style={styles.classItem}>
                <CalendarIcon size={20} color={COLORS.secondary} />
                <View style={styles.classInfo}>
                  <Text style={styles.className}>{item.classes?.activities?.name}</Text>
                  <Text style={styles.classSchedule}>
                    {item.classes?.start_time} - {item.classes?.end_time}
                  </Text>
                </View>
                <CheckCircle size={20} color={COLORS.success} />
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Aún no estás anotado en ninguna clase.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    padding: 20,
    backgroundColor: COLORS.background,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planTextContainer: {
    marginLeft: 15,
  },
  planName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  planDate: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: 'bold',
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  classInfo: {
    flex: 1,
    marginLeft: 15,
  },
  className: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.black,
  },
  classSchedule: {
    fontSize: 12,
    color: COLORS.gray,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.gray,
    textAlign: 'center',
  },
});

export default StudentDashboard;
