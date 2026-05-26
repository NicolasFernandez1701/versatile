import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Title, Button, Text, TextInput, Card, List } from 'react-native-paper';
import { supabase } from '../../api/supabaseClient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format, addDays } from 'date-fns';
import { ThemeContainer } from '../../components/ThemeContainer';
import { useThemeColors } from '../../hooks/useThemeColors';

const PLANS = [
  { id: 'libre', name: 'Pase Libre', price: '12000' },
  { id: '8clases', name: '8 Clases al mes', price: '8500' },
  { id: '4clases', name: '4 Clases al mes', price: '5000' },
  { id: 'clase_suelta', name: 'Clase Suelta', price: '2000' },
];

const RecordPaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const colors = useThemeColors();
  const [loading, setLoading] = useState(false);
  
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(route.params?.studentId || null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'student');
    if (data) setStudents(data);
  };

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
    setAmount(plan.price);
  };

  const handleRecord = async () => {
    if (!selectedStudent || !selectedPlan || !amount) {
      Alert.alert('Error', 'Completa todos los campos.');
      return;
    }

    setLoading(true);
    
    // Calculate expiration: 30 days from now
    const expirationDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');

    const { error } = await supabase.from('payments').insert({
      student_id: selectedStudent,
      amount: parseFloat(amount),
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      expiration_date: expirationDate,
      plan_details: selectedPlan.name,
    });

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Éxito', `Pago registrado. Vence el ${expirationDate}`);
      navigation.goBack();
    }
    setLoading(false);
  };

  return (
    <ThemeContainer>
      <Title style={{ color: colors.black, marginBottom: 20 }}>Registrar Pago</Title>

      <Text style={[styles.label, { color: colors.primary }]}>1. Selecciona Alumno</Text>
      <Card style={[styles.card, { backgroundColor: colors.white, borderColor: colors.lightGray, shadowColor: colors.isDark ? 'transparent' : colors.black }]}>
        <ScrollView style={{ maxHeight: 150 }}>
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

      <Text style={[styles.label, { color: colors.primary }]}>2. Selecciona Plan</Text>
      <View style={styles.planContainer}>
        {PLANS.map(p => (
          <TouchableOpacity 
            key={p.id} 
            style={[
              styles.planChip, 
              { backgroundColor: colors.white, borderColor: colors.lightGray },
              selectedPlan?.id === p.id && [styles.selectedPlanChip, { backgroundColor: colors.primary, borderColor: colors.primary }]
            ]}
            onPress={() => handleSelectPlan(p)}
          >
            <Text style={[
              styles.planChipText, 
              { color: colors.black },
              selectedPlan?.id === p.id && styles.selectedPlanChipText
            ]}>
              {p.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.primary }]}>3. Monto Abonado ($)</Text>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        mode="outlined"
        keyboardType="numeric"
        style={[styles.input, { backgroundColor: colors.white }]}
        textColor={colors.black}
        outlineColor={colors.lightGray}
        activeOutlineColor={colors.primary}
      />

      <Button
        mode="contained"
        onPress={handleRecord}
        loading={loading}
        style={styles.button}
        buttonColor={colors.primary}
        textColor="#FFFFFF"
      >
        Confirmar Pago
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
  planContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  planChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  selectedPlanChip: {
    elevation: 0,
  },
  planChipText: {
    fontSize: 12,
  },
  selectedPlanChipText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  input: {
    height: 50,
  },
  button: {
    marginTop: 30,
    paddingVertical: 8,
    borderRadius: 12,
  }
});

export default RecordPaymentScreen;
