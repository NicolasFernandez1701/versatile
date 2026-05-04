import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView, Alert } from 'react-native';
import { TextInput, Button, Text, Title, HelperText } from 'react-native-paper';
import { supabase } from '../../api/supabaseClient';
import { COLORS } from '../../theme/colors';
import VersatileHeader from '../../components/VersatileHeader';
import { useNavigation } from '@react-navigation/native';

const AddClassScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [activityId, setActivityId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('1'); // 1 = Lunes
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:00');
  const [capacity, setCapacity] = useState('15');
  const [basePrice, setBasePrice] = useState('5000');
  const [commission, setCommission] = useState('50');

  // Lists for Pickers (In a real app, use a real Picker component)
  const [activities, setActivities] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: acts } = await supabase.from('activities').select('*');
    const { data: tchrs } = await supabase.from('profiles').select('*').eq('role', 'teacher');
    
    if (acts) setActivities(acts);
    if (tchrs) setTeachers(tchrs);

    // Auto-select first if available
    if (acts?.[0]) setActivityId(acts[0].id);
    if (tchrs?.[0]) setTeacherId(tchrs[0].id);
  };

  const handleCreate = async () => {
    if (!activityId || !teacherId) {
      Alert.alert('Error', 'Debes seleccionar una actividad y una profesora.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('classes').insert({
      activity_id: activityId,
      teacher_id: teacherId,
      day_of_week: parseInt(dayOfWeek),
      start_time: startTime,
      end_time: endTime,
      capacity: parseInt(capacity),
      base_price: parseFloat(basePrice),
      teacher_commission_pct: parseFloat(commission),
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Éxito', 'Clase creada correctamente');
      navigation.goBack();
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <VersatileHeader />
      <ScrollView contentContainerStyle={styles.container}>
        <Title style={styles.title}>Nueva Clase</Title>
        
        <Text style={styles.label}>Actividad ID (Próximamente Selector)</Text>
        <TextInput
          value={activityId}
          onChangeText={setActivityId}
          mode="outlined"
          style={styles.input}
        />
        <HelperText type="info">Ingresa el ID de la actividad (ej: del listado)</HelperText>

        <Text style={styles.label}>Profesora ID</Text>
        <TextInput
          value={teacherId}
          onChangeText={setTeacherId}
          mode="outlined"
          style={styles.input}
        />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Día (0-6)</Text>
            <TextInput
              value={dayOfWeek}
              onChangeText={setDayOfWeek}
              mode="outlined"
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Capacidad</Text>
            <TextInput
              value={capacity}
              onChangeText={setCapacity}
              mode="outlined"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Inicio (HH:MM)</Text>
            <TextInput
              value={startTime}
              onChangeText={setStartTime}
              mode="outlined"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Fin (HH:MM)</Text>
            <TextInput
              value={endTime}
              onChangeText={setEndTime}
              mode="outlined"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={styles.label}>Precio Base ($)</Text>
            <TextInput
              value={basePrice}
              onChangeText={setBasePrice}
              mode="outlined"
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Comisión Profe (%)</Text>
            <TextInput
              value={commission}
              onChangeText={setCommission}
              mode="outlined"
              keyboardType="numeric"
            />
          </View>
        </View>

        <Button
          mode="contained"
          onPress={handleCreate}
          loading={loading}
          style={styles.button}
          buttonColor={COLORS.primary}
        >
          Guardar Clase
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
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: COLORS.black,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 4,
    marginTop: 10,
  },
  input: {
    marginBottom: 10,
    backgroundColor: COLORS.white,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  button: {
    marginTop: 30,
    paddingVertical: 8,
    borderRadius: 12,
  },
});

export default AddClassScreen;
