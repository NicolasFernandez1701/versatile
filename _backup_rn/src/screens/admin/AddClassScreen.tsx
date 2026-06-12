import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Title, Portal, Modal, List } from 'react-native-paper';
import { supabase } from '../../api/supabaseClient';
import { useNavigation } from '@react-navigation/native';
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

const AddClassScreen = () => {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [activityName, setActivityName] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [teacherName, setTeacherName] = useState('Seleccionar Profesora');
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('19:00');
  const [capacity, setCapacity] = useState('15');
  const [basePrice, setBasePrice] = useState('5000');
  const [commission, setCommission] = useState('50');

  // Menus visibility
  const [showTeacherMenu, setShowTeacherMenu] = useState(false);
  const [showDayMenu, setShowDayMenu] = useState(false);

  const [teachers, setTeachers] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: tchrs } = await supabase.from('profiles').select('*').eq('role', 'teacher');
    if (tchrs) setTeachers(tchrs);
  };

  const handleCreate = async () => {
    if (!activityName || !teacherId) {
      Alert.alert('Error', 'Debes ingresar una actividad y seleccionar una profesora.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('classes').insert({
      activity_name: activityName,
      teacher_id: teacherId,
      day_of_week: dayOfWeek,
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
    <ThemeContainer>
      <Title style={[styles.title, { color: colors.black }]}>Nueva Clase</Title>
      
      {/* Selector de Actividad */}
      <Text style={[styles.label, { color: colors.primary }]}>Actividad</Text>
      <TextInput
        value={activityName}
        onChangeText={setActivityName}
        mode="outlined"
        placeholder="Ej: Funcional, Yoga, Zumba"
        placeholderTextColor={colors.gray}
        style={[styles.input, { backgroundColor: colors.white }]}
        textColor={colors.black}
        outlineColor={colors.lightGray}
        activeOutlineColor={colors.primary}
      />

      {/* Selector de Profesora */}
      <Text style={[styles.label, { color: colors.primary }]}>Profesora</Text>
      <TouchableOpacity 
        onPress={() => setShowTeacherMenu(true)}
        style={[styles.pickerButton, { backgroundColor: colors.white, borderColor: colors.lightGray }]}
      >
        <Text style={{ color: teacherId ? colors.black : colors.gray }}>{teacherName}</Text>
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

      {/* Modales de Selección - Rediseñados como Bottom Sheets */}
      <Portal>
        {/* Modal Profesoras */}
        <Modal visible={showTeacherMenu} onDismiss={() => setShowTeacherMenu(false)} contentContainerStyle={[styles.bottomSheet, { backgroundColor: colors.white }]}>
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.lightGray }]} />
            <Title style={[styles.sheetTitle, { color: colors.black }]}>Profesora</Title>
          </View>
          <ScrollView style={styles.sheetScroll}>
            {teachers.map(t => (
              <TouchableOpacity 
                key={t.id} 
                style={[styles.sheetItem, teacherId === t.id && [styles.sheetItemActive, { backgroundColor: colors.isDark ? '#2A2740' : '#F0EFFF' }]]}
                onPress={() => {
                  setTeacherId(t.id);
                  setTeacherName(t.full_name);
                  setShowTeacherMenu(false);
                }}
              >
                <Text style={[styles.sheetItemText, { color: teacherId === t.id ? colors.primary : colors.gray }]}>{t.full_name}</Text>
                {teacherId === t.id && <List.Icon icon="check" color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Modal>

        {/* Modal Días */}
        <Modal visible={showDayMenu} onDismiss={() => setShowDayMenu(false)} contentContainerStyle={[styles.bottomSheet, { backgroundColor: colors.white }]}>
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.lightGray }]} />
            <Title style={[styles.sheetTitle, { color: colors.black }]}>Día de la Semana</Title>
          </View>
          <View style={styles.sheetScroll}>
            {days.map(d => (
              <TouchableOpacity 
                key={d.value} 
                style={[styles.sheetItem, dayOfWeek === d.value && [styles.sheetItemActive, { backgroundColor: colors.isDark ? '#2A2740' : '#F0EFFF' }]]}
                onPress={() => {
                  setDayOfWeek(d.value);
                  setShowDayMenu(false);
                }}
              >
                <Text style={[styles.sheetItemText, { color: dayOfWeek === d.value ? colors.primary : colors.gray }]}>{d.label}</Text>
                {dayOfWeek === d.value && <List.Icon icon="check" color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </Modal>
      </Portal>

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
            placeholder="18:00"
            placeholderTextColor={colors.gray}
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
            placeholder="19:00"
            placeholderTextColor={colors.gray}
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
        onPress={handleCreate}
        loading={loading}
        style={styles.button}
        buttonColor={colors.primary}
        textColor="#FFFFFF"
      >
        Guardar Clase
      </Button>
    </ThemeContainer>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
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
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingVertical: 15,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sheetScroll: {
    marginTop: 10,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 5,
  },
  sheetItemActive: {
    elevation: 0,
  },
  sheetItemText: {
    fontSize: 16,
  },
});

export default AddClassScreen;
