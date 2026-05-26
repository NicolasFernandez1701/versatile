import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Title, Portal, Modal, List } from 'react-native-paper';
import { supabase } from '../../api/supabaseClient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ChevronDown } from 'lucide-react-native';
import { ThemeContainer } from '../../components/ThemeContainer';
import { useThemeColors } from '../../hooks/useThemeColors';

const days = [
  { label: 'Domingo', value: 0 },
  { label: 'Lunes', value: 1 },
  { label: 'Martes', value: 2 },
  { label: 'Miércoles', value: 3 },
  { label: 'Jueves', value: 4 },
  { label: 'Viernes', value: 5 },
  { label: 'Sábado', value: 6 },
];

const EditClassScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const colors = useThemeColors();
  const { classId } = route.params;
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  // Form State
  const [activityId, setActivityId] = useState('');
  const [activityName, setActivityName] = useState('Seleccionar Actividad');
  const [teacherId, setTeacherId] = useState('');
  const [teacherName, setTeacherName] = useState('Seleccionar Profesora');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [capacity, setCapacity] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [commission, setCommission] = useState('');

  // Menus visibility
  const [showActivityMenu, setShowActivityMenu] = useState(false);
  const [showTeacherMenu, setShowTeacherMenu] = useState(false);
  const [showDayMenu, setShowDayMenu] = useState(false);

  const [activities, setActivities] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    // 1. Fetch Class Data
    const { data: classData } = await supabase
      .from('classes')
      .select('*, activities(name), profiles(full_name)')
      .eq('id', classId)
      .single();

    if (classData) {
      setActivityId(classData.activity_id);
      setActivityName(classData.activities?.name || 'Seleccionar Actividad');
      setTeacherId(classData.teacher_id);
      setTeacherName(classData.profiles?.full_name || 'Seleccionar Profesora');
      setDayOfWeek(classData.day_of_week);
      setStartTime(classData.start_time.slice(0, 5));
      setEndTime(classData.end_time.slice(0, 5));
      setCapacity(classData.capacity.toString());
      setBasePrice(classData.base_price.toString());
      setCommission(classData.teacher_commission_pct.toString());
    }

    // 2. Fetch Lists
    const { data: acts } = await supabase.from('activities').select('*');
    const { data: tchrs } = await supabase.from('profiles').select('*').eq('role', 'teacher');
    
    if (acts) setActivities(acts);
    if (tchrs) setTeachers(tchrs);

    setFetching(false);
  };

  const handleUpdate = async () => {
    if (!activityId || !teacherId) {
      Alert.alert('Error', 'Debes seleccionar una actividad y una profesora.');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('classes')
      .update({
        activity_id: activityId,
        teacher_id: teacherId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        capacity: parseInt(capacity),
        base_price: parseFloat(basePrice),
        teacher_commission_pct: parseFloat(commission),
      })
      .eq('id', classId);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Éxito', 'Clase actualizada correctamente');
      navigation.goBack();
    }
    setLoading(false);
  };

  if (fetching) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ThemeContainer>
      <Title style={[styles.title, { color: colors.black }]}>Editar Clase</Title>
      
      {/* Selector de Actividad */}
      <Text style={[styles.label, { color: colors.primary }]}>Actividad</Text>
      <TouchableOpacity 
        onPress={() => setShowActivityMenu(true)}
        style={[styles.pickerButton, { backgroundColor: colors.white, borderColor: colors.lightGray }]}
      >
        <Text style={{ color: colors.black }}>{activityName}</Text>
        <ChevronDown size={20} color={colors.primary} />
      </TouchableOpacity>

      {/* Selector de Profesora */}
      <Text style={[styles.label, { color: colors.primary }]}>Profesora</Text>
      <TouchableOpacity 
        onPress={() => setShowTeacherMenu(true)}
        style={[styles.pickerButton, { backgroundColor: colors.white, borderColor: colors.lightGray }]}
      >
        <Text style={{ color: colors.black }}>{teacherName}</Text>
        <ChevronDown size={20} color={colors.primary} />
      </TouchableOpacity>

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={[styles.label, { color: colors.primary }]}>Día</Text>
          <TouchableOpacity 
            onPress={() => setShowDayMenu(true)}
            style={[styles.pickerButton, { backgroundColor: colors.white, borderColor: colors.lightGray }]}
          >
            <Text style={{ color: colors.black }}>
              {days.find(d => d.value === dayOfWeek)?.label || 'Lunes'}
            </Text>
            <ChevronDown size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.primary }]}>Capacidad</Text>
          <TextInput
            value={capacity}
            onChangeText={setCapacity}
            mode="outlined"
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: colors.white }]}
            textColor={colors.black}
            outlineColor={colors.lightGray}
            activeOutlineColor={colors.primary}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={[styles.label, { color: colors.primary }]}>Inicio (HH:MM)</Text>
          <TextInput
            value={startTime}
            onChangeText={setStartTime}
            mode="outlined"
            style={[styles.input, { backgroundColor: colors.white }]}
            textColor={colors.black}
            outlineColor={colors.lightGray}
            activeOutlineColor={colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.primary }]}>Fin (HH:MM)</Text>
          <TextInput
            value={endTime}
            onChangeText={setEndTime}
            mode="outlined"
            style={[styles.input, { backgroundColor: colors.white }]}
            textColor={colors.black}
            outlineColor={colors.lightGray}
            activeOutlineColor={colors.primary}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={[styles.label, { color: colors.primary }]}>Precio Base ($)</Text>
          <TextInput
            value={basePrice}
            onChangeText={setBasePrice}
            mode="outlined"
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: colors.white }]}
            textColor={colors.black}
            outlineColor={colors.lightGray}
            activeOutlineColor={colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.primary }]}>Comisión Profe (%)</Text>
          <TextInput
            value={commission}
            onChangeText={setCommission}
            mode="outlined"
            keyboardType="numeric"
            style={[styles.input, { backgroundColor: colors.white }]}
            textColor={colors.black}
            outlineColor={colors.lightGray}
            activeOutlineColor={colors.primary}
          />
        </View>
      </View>

      <Button
        mode="contained"
        onPress={handleUpdate}
        loading={loading}
        style={styles.button}
        buttonColor={colors.primary}
        textColor="#FFFFFF"
      >
        Guardar Cambios
      </Button>

      {/* Modales de Selección */}
      <Portal>
        <Modal visible={showActivityMenu} onDismiss={() => setShowActivityMenu(false)} contentContainerStyle={[styles.modal, { backgroundColor: colors.white }]}>
          <Title style={{ color: colors.black }}>Seleccionar Actividad</Title>
          <ScrollView style={{ maxHeight: 300 }}>
            {activities.map(act => (
              <List.Item
                key={act.id}
                title={act.name}
                titleStyle={{ color: colors.black }}
                onPress={() => {
                  setActivityId(act.id);
                  setActivityName(act.name);
                  setShowActivityMenu(false);
                }}
              />
            ))}
          </ScrollView>
        </Modal>

        <Modal visible={showTeacherMenu} onDismiss={() => setShowTeacherMenu(false)} contentContainerStyle={[styles.modal, { backgroundColor: colors.white }]}>
          <Title style={{ color: colors.black }}>Seleccionar Profesora</Title>
          <ScrollView style={{ maxHeight: 300 }}>
            {teachers.map(t => (
              <List.Item
                key={t.id}
                title={t.full_name}
                titleStyle={{ color: colors.black }}
                onPress={() => {
                  setTeacherId(t.id);
                  setTeacherName(t.full_name);
                  setShowTeacherMenu(false);
                }}
              />
            ))}
          </ScrollView>
        </Modal>

        <Modal visible={showDayMenu} onDismiss={() => setShowDayMenu(false)} contentContainerStyle={[styles.modal, { backgroundColor: colors.white }]}>
          <Title style={{ color: colors.black }}>Seleccionar Día</Title>
          {days.map(d => (
            <List.Item
              key={d.value}
              title={d.label}
              titleStyle={{ color: colors.black }}
              onPress={() => {
                setDayOfWeek(d.value);
                setShowDayMenu(false);
              }}
            />
          ))}
        </Modal>
      </Portal>
    </ThemeContainer>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    height: 50,
  },
  pickerButton: {
    borderRadius: 12,
    borderWidth: 1,
    height: 55,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  row: {
    flexDirection: 'row',
    marginTop: 5,
  },
  button: {
    marginTop: 40,
    paddingVertical: 10,
    borderRadius: 15,
    elevation: 4,
  },
  modal: {
    padding: 20,
    margin: 20,
    borderRadius: 16,
  },
});

export default EditClassScreen;
