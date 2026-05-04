import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { COLORS } from '../../theme/colors';
import VersatileHeader from '../../components/VersatileHeader';
import SummaryCard from '../../components/SummaryCard';
import { DollarSign, Users, Calendar, TrendingUp } from 'lucide-react-native';
import { supabase } from '../../api/supabaseClient';
import { useNavigation } from '@react-navigation/native';

const AdminDashboard = () => {
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState({
    totalBalance: 0,
    totalStudents: 0,
    activeClasses: 0,
    teacherPayouts: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      // 1. Total Students
      const { count: studentCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

      // 2. Active Classes
      const { count: classCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // 3. Total Balance (Payments)
      const { data: payments } = await supabase
        .from('payments')
        .select('amount');
      
      const totalBalance = payments?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      // 4. Teacher Payouts (Mocked logically as 0 for now until commissions are calculated)
      // Actually, let's fetch it if the table exists
      const { data: commissions } = await supabase
        .from('commissions')
        .select('amount_earned');
      
      const teacherPayouts = commissions?.reduce((acc, curr) => acc + Number(curr.amount_earned), 0) || 0;

      setStats({
        totalBalance: totalBalance,
        totalStudents: studentCount || 0,
        activeClasses: classCount || 0,
        teacherPayouts: teacherPayouts,
      });
    };

    fetchStats();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <VersatileHeader />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen Mensual</Text>
          <View style={styles.row}>
            <SummaryCard 
              title="Balance Total" 
              value={`$${stats.totalBalance}`} 
              subtitle="+12% vs mes pasado"
              icon={DollarSign}
              iconColor={COLORS.success}
            />
            <SummaryCard 
              title="Alumnos" 
              value={stats.totalStudents} 
              subtitle="3 nuevos hoy"
              icon={Users}
            />
          </View>
          <View style={styles.row}>
            <SummaryCard 
              title="Clases Activas" 
              value={stats.activeClasses} 
              icon={Calendar}
              iconColor={COLORS.secondary}
            />
            <SummaryCard 
              title="Pago Profes" 
              value={`$${stats.teacherPayouts}`} 
              subtitle="50% del ingreso"
              icon={TrendingUp}
              iconColor={COLORS.primary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('ClassManagement')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F0EFFF' }]}>
                <Calendar color={COLORS.primary} size={24} />
              </View>
              <Text style={styles.actionText}>Clases</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('StudentManagement')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
                <Users color={COLORS.success} size={24} />
              </View>
              <Text style={styles.actionText}>Alumnos</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('RecordPayment')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
                <DollarSign color={COLORS.warning} size={24} />
              </View>
              <Text style={styles.actionText}>Pagos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionIcon, { backgroundColor: '#FFEBEE' }]}>
                <TrendingUp color={COLORS.error} size={24} />
              </View>
              <Text style={styles.actionText}>Balance</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Próximas Clases</Text>
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No hay clases programadas para hoy.</Text>
          </View>
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  actionButton: {
    alignItems: 'center',
    width: 70,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.black,
  },
  emptyState: {
    backgroundColor: COLORS.white,
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderStyle: 'dashed',
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 14,
  },
});

export default AdminDashboard;
