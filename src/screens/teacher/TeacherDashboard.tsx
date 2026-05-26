import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import VersatileHeader from '../../components/VersatileHeader';
import { supabase } from '../../api/supabaseClient';
import { Calendar as CalendarIcon, Users } from 'lucide-react-native';

const TeacherDashboard = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyClasses();
  }, []);

  const fetchMyClasses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('classes')
      .select('*, activities(name), enrollments(count)')
      .eq('teacher_id', user.id)
      .eq('is_active', true);

    if (data) setClasses(data);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <VersatileHeader />
      <View style={styles.container}>
        <Text style={styles.title}>Mis Clases de Hoy</Text>
        
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.classCard}>
              <View style={styles.classHeader}>
                <Text style={styles.className}>{item.activities?.name}</Text>
                <Text style={styles.classTime}>{item.start_time} - {item.end_time}</Text>
              </View>
              <View style={styles.classFooter}>
                <View style={styles.stat}>
                  <Users size={16} color={COLORS.gray} />
                  <Text style={styles.statText}>{item.enrollments?.[0]?.count || 0} / {item.capacity} Alumnos</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>Activa</Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <CalendarIcon size={48} color={COLORS.lightGray} />
              <Text style={styles.emptyText}>No tienes clases programadas.</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.background,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 20,
  },
  classCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  classHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  classTime: {
    fontSize: 14,
    color: COLORS.gray,
  },
  classFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingTop: 12,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    marginLeft: 6,
    fontSize: 14,
    color: COLORS.gray,
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    color: COLORS.gray,
    fontSize: 16,
  },
});

export default TeacherDashboard;
