import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Title, Button, Text, Card, List, Searchbar } from 'react-native-paper';
import { COLORS } from '../../theme/colors';
import VersatileHeader from '../../components/VersatileHeader';
import { supabase } from '../../api/supabaseClient';
import { useNavigation, useRoute } from '@react-navigation/native';

const EnrollStudentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const [loading, setLoading] = useState(false);
  
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  
  const [selectedStudent, setSelectedStudent] = useState<string | null>(route.params?.studentId || null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: stds } = await supabase.from('profiles').select('*').eq('role', 'student');
    const { data: clss } = await supabase.from('classes').select('*, activities(name)');
    
    if (stds) setStudents(stds);
    if (clss) setClasses(clss);
  };

  const handleEnroll = async () => {
    if (!selectedStudent || !selectedClass) {
      Alert.alert('Error', 'Selecciona un alumno y una clase.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('enrollments').insert({
      student_id: selectedStudent,
      class_id: selectedClass,
    });

    if (error) {
      if (error.code === '23505') {
        Alert.alert('Aviso', 'El alumno ya está inscrito en esta clase.');
      } else {
        Alert.alert('Error', error.message);
      }
    } else {
      Alert.alert('Éxito', 'Alumno inscrito correctamente');
      navigation.goBack();
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <VersatileHeader />
      <ScrollView contentContainerStyle={styles.container}>
        <Title style={styles.title}>Inscribir Alumno</Title>

        <Text style={styles.label}>1. Selecciona Alumno</Text>
        <Card style={styles.card}>
          <ScrollView style={{ maxHeight: 200 }}>
            {students.map(s => (
              <List.Item
                key={s.id}
                title={s.full_name}
                onPress={() => setSelectedStudent(s.id)}
                left={props => <List.Icon {...props} icon="account" color={selectedStudent === s.id ? COLORS.primary : COLORS.gray} />}
                style={{ backgroundColor: selectedStudent === s.id ? '#F0EFFF' : 'transparent' }}
              />
            ))}
          </ScrollView>
        </Card>

        <Text style={styles.label}>2. Selecciona Clase</Text>
        <Card style={styles.card}>
          <ScrollView style={{ maxHeight: 200 }}>
            {classes.map(c => (
              <List.Item
                key={c.id}
                title={c.activities?.name}
                description={`${c.start_time.slice(0,5)} - ${c.capacity} cupos`}
                onPress={() => setSelectedClass(c.id)}
                left={props => <List.Icon {...props} icon="calendar" color={selectedClass === c.id ? COLORS.primary : COLORS.gray} />}
                style={{ backgroundColor: selectedClass === c.id ? '#F0EFFF' : 'transparent' }}
              />
            ))}
          </ScrollView>
        </Card>

        <Button
          mode="contained"
          onPress={handleEnroll}
          loading={loading}
          style={styles.button}
          buttonColor={COLORS.primary}
        >
          Confirmar Inscripción
        </Button>
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
  },
  title: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 15,
    color: COLORS.primary,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  button: {
    marginTop: 30,
    paddingVertical: 8,
    borderRadius: 12,
  }
});

export default EnrollStudentScreen;
