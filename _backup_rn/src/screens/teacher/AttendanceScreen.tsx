import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Title, Text, Button, List, Checkbox, Card } from 'react-native-paper';
import { COLORS } from '../../theme/colors';
import VersatileHeader from '../../components/VersatileHeader';
import { supabase } from '../../api/supabaseClient';
import { useAuthStore } from '../../store/useAuthStore';
import { format } from 'date-fns';

const AttendanceScreen = () => {
  const { profile } = useAuthStore();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    fetchMyClasses();
  }, []);

  const fetchMyClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', profile?.id)
      .eq('is_active', true);
    
    if (data) setClasses(data);
  };

  const fetchEnrolledStudents = async (classId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('enrollments')
      .select('*, profiles(full_name)')
      .eq('class_id', classId);
    
    if (data) {
      setStudents(data);
      // Initialize attendance state
      const initial: Record<string, boolean> = {};
      data.forEach(s => initial[s.id] = false);
      setAttendance(initial);
    }
    setLoading(false);
  };

  const handleSelectClass = (cls: any) => {
    setSelectedClass(cls);
    fetchEnrolledStudents(cls.id);
  };

  const toggleAttendance = (enrollmentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [enrollmentId]: !prev[enrollmentId]
    }));
  };

  const saveAttendance = async () => {
    setLoading(true);
    const records = Object.entries(attendance).map(([enrollmentId, isPresent]) => ({
      enrollment_id: enrollmentId,
      date: today,
      status: isPresent ? 'present' : 'absent'
    }));

    const { error } = await supabase.from('attendance').upsert(records, {
      onConflict: 'enrollment_id,date'
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Éxito', 'Asistencia guardada correctamente.');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <VersatileHeader />
      <View style={styles.container}>
        <Title style={styles.title}>Toma de Asistencia</Title>
        <Text style={styles.dateText}>{format(new Date(), 'eeee dd/MM')}</Text>

        {!selectedClass ? (
          <View style={styles.classList}>
            <Text style={styles.label}>Selecciona una clase:</Text>
            {classes.map(c => (
              <List.Item
                key={c.id}
                title={c.activity_name}
                description={`${c.start_time.slice(0, 5)} - ${c.end_time.slice(0, 5)}`}
                onPress={() => handleSelectClass(c)}
                left={props => <List.Icon {...props} icon="calendar-check" color={COLORS.primary} />}
                style={styles.classItem}
              />
            ))}
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <View style={styles.selectedHeader}>
              <Text style={styles.selectedTitle}>{selectedClass.activity_name}</Text>
              <Button mode="text" onPress={() => setSelectedClass(null)} textColor={COLORS.primary}>Cambiar</Button>
            </View>

            <FlatList
              data={students}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <List.Item
                  title={item.profiles?.full_name}
                  right={() => (
                    <Checkbox
                      status={attendance[item.id] ? 'checked' : 'unchecked'}
                      onPress={() => toggleAttendance(item.id)}
                      color={COLORS.primary}
                    />
                  )}
                  style={styles.studentItem}
                />
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No hay alumnos inscriptos en esta clase.</Text>}
            />

            <Button
              mode="contained"
              onPress={saveAttendance}
              loading={loading}
              style={styles.saveButton}
              buttonColor={COLORS.primary}
            >
              Guardar Asistencia
            </Button>
          </View>
        )}
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
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  dateText: {
    color: COLORS.gray,
    marginBottom: 20,
    textTransform: 'capitalize',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  classList: {
    marginTop: 10,
  },
  classItem: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: 10,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#F0EFFF',
    padding: 10,
    borderRadius: 12,
  },
  selectedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  studentItem: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: COLORS.gray,
  },
  saveButton: {
    marginTop: 20,
    paddingVertical: 8,
    borderRadius: 12,
  }
});

export default AttendanceScreen;
