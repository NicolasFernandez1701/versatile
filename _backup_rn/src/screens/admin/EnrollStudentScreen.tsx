import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Title, Button, Text, Card, List } from 'react-native-paper';
import { supabase } from '../../api/supabaseClient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ThemeContainer } from '../../components/ThemeContainer';
import { useThemeColors } from '../../hooks/useThemeColors';

const EnrollStudentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const colors = useThemeColors();
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
    const { data: clss } = await supabase.from('classes').select('*');
    
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
    <ThemeContainer>
      <Title style={{ color: colors.black, marginBottom: 20 }}>Inscribir Alumno</Title>

      <Text style={[styles.label, { color: colors.primary }]}>1. Selecciona Alumno</Text>
      <Card style={[styles.card, { backgroundColor: colors.white, borderColor: colors.lightGray, shadowColor: colors.isDark ? 'transparent' : colors.black }]}>
        <ScrollView style={{ maxHeight: 200 }}>
          {students.map(s => (
            <List.Item
              key={s.id}
              title={s.full_name}
              titleStyle={{ color: colors.black }}
              onPress={() => setSelectedStudent(s.id)}
              left={props => <List.Icon {...props} icon="account" color={selectedStudent === s.id ? colors.primary : colors.gray} />}
              style={{ backgroundColor: selectedStudent === s.id ? (colors.isDark ? '#2A2740' : '#F0EFFF') : 'transparent' }}
            />
          ))}
        </ScrollView>
      </Card>

      <Text style={[styles.label, { color: colors.primary }]}>2. Selecciona Clase</Text>
      <Card style={[styles.card, { backgroundColor: colors.white, borderColor: colors.lightGray, shadowColor: colors.isDark ? 'transparent' : colors.black }]}>
        <ScrollView style={{ maxHeight: 200 }}>
          {classes.map(c => (
            <List.Item
              key={c.id}
              title={c.activity_name}
              titleStyle={{ color: colors.black }}
              description={`${c.start_time.slice(0,5)} - ${c.capacity} cupos`}
              descriptionStyle={{ color: colors.gray }}
              onPress={() => setSelectedClass(c.id)}
              left={props => <List.Icon {...props} icon="calendar" color={selectedClass === c.id ? colors.primary : colors.gray} />}
              style={{ backgroundColor: selectedClass === c.id ? (colors.isDark ? '#2A2740' : '#F0EFFF') : 'transparent' }}
            />
          ))}
        </ScrollView>
      </Card>

      <Button
        mode="contained"
        onPress={handleEnroll}
        loading={loading}
        style={styles.button}
        buttonColor={colors.primary}
        textColor="#FFFFFF"
      >
        Confirmar Inscripción
      </Button>
    </ThemeContainer>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 15,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  button: {
    marginTop: 30,
    paddingVertical: 8,
    borderRadius: 12,
  }
});

export default EnrollStudentScreen;
