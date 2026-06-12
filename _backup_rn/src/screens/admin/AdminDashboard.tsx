import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SummaryCard from '../../components/SummaryCard';
import { DollarSign, Users, Calendar, TrendingUp, CheckSquare } from 'lucide-react-native';
import { supabase } from '../../api/supabaseClient';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../../hooks/useThemeColors';

const AdminDashboard = () => {
  const navigation = useNavigation<any>();
  const colors = useThemeColors();
  const [stats, setStats] = useState({
    totalBalance: 0,
    totalStudents: 0,
    activeClasses: 0,
    teacherPayouts: 0,
  });
  const [todayClasses, setTodayClasses] = useState<any[]>([]);

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

      // 4. Teacher Payouts
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

      // 5. Today's Classes
      const today = new Date().getDay();
      const { data: classes } = await supabase
        .from('classes')
        .select('*, profiles(full_name)')
        .eq('day_of_week', today)
        .eq('is_active', true)
        .order('start_time', { ascending: true });
      
      setTodayClasses(classes || []);
    };

    fetchStats();
  }, []);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.white }]}>
      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.black }]}>Resumen Mensual</Text>
          <View style={styles.row}>
            <SummaryCard 
              title="Balance Total" 
              value={`$${stats.totalBalance}`} 
              icon={DollarSign}
              iconColor={colors.success}
            />
            <SummaryCard 
              title="Alumnos" 
              value={stats.totalStudents} 
              icon={Users}
              iconColor={colors.primary}
            />
          </View>
          <View style={styles.row}>
            <SummaryCard 
              title="Clases Activas" 
              value={stats.activeClasses} 
              icon={Calendar}
              iconColor={colors.secondary}
            />
            <SummaryCard 
              title="Pago Profes" 
              value={`$${stats.teacherPayouts}`} 
              icon={TrendingUp}
              iconColor={colors.primary}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.black }]}>Acciones Rápidas</Text>
          <View style={[styles.actionGrid, { backgroundColor: colors.white }]}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('ClassManagement')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.isDark ? '#2A2740' : '#F0EFFF' }]}>
                <Calendar color={colors.primary} size={24} />
              </View>
              <Text style={[styles.actionText, { color: colors.black }]}>Clases</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('StudentManagement')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.isDark ? '#1C3E2D' : '#E8F5E9' }]}>
                <Users color={colors.success} size={24} />
              </View>
              <Text style={[styles.actionText, { color: colors.black }]}>Alumnos</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('RecordPayment')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.isDark ? '#3E2E1C' : '#FFF3E0' }]}>
                <DollarSign color={colors.warning} size={24} />
              </View>
              <Text style={[styles.actionText, { color: colors.black }]}>Pagos</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('FinancialReports')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.isDark ? '#3E1C1F' : '#FFEBEE' }]}>
                <TrendingUp color={colors.error} size={24} />
              </View>
              <Text style={[styles.actionText, { color: colors.black }]}>Balance</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => navigation.navigate('PlanManagement')}
            >
              <View style={[styles.actionIcon, { backgroundColor: colors.isDark ? '#341C3E' : '#F3E5F5' }]}>
                <CheckSquare color={colors.primary} size={24} />
              </View>
              <Text style={[styles.actionText, { color: colors.black }]}>Planes</Text>
            </TouchableOpacity>
            
            {/* Espacio vacío para mantener el grid alineado */}
            <View style={styles.actionButton} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.black }]}>Próximas Clases de Hoy</Text>
          {todayClasses.length > 0 ? (
            todayClasses.map((item) => (
              <View key={item.id} style={[styles.classCard, { backgroundColor: colors.white, shadowColor: colors.isDark ? 'transparent' : colors.black }]}>
                <View style={styles.classInfo}>
                  <Text style={[styles.classActivity, { color: colors.primary }]}>{item.activity_name}</Text>
                  <Text style={[styles.classTeacher, { color: colors.gray }]}>Prof: {item.profiles?.full_name}</Text>
                </View>
                <View style={[styles.classTimeContainer, { backgroundColor: colors.isDark ? '#2A2740' : '#F0EFFF' }]}>
                  <Text style={[styles.classTime, { color: colors.primary }]}>{item.start_time.slice(0, 5)} hs</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyState, { backgroundColor: colors.white, borderColor: colors.lightGray }]}>
              <Text style={[styles.emptyText, { color: colors.gray }]}>No hay clases programadas para hoy.</Text>
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
  },
  container: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  actionButton: {
    alignItems: 'center',
    width: '30%',
    marginBottom: 20,
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
  },
  emptyState: {
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
  },
  classCard: {
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  classInfo: {
    flex: 1,
  },
  classActivity: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  classTeacher: {
    fontSize: 13,
    marginTop: 2,
  },
  classTimeContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  classTime: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default AdminDashboard;
