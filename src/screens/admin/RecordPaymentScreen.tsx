import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Alert } from 'react-native';
import { Title, Button, Text, TextInput, Card, List } from 'react-native-paper';
import { COLORS } from '../../theme/colors';
import VersatileHeader from '../../components/VersatileHeader';
import { supabase } from '../../api/supabaseClient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format, addDays } from 'date-fns';

const PLANS = [
  { id: 'libre', name: 'Pase Libre', price: '12000' },
  { id: '8clases', name: '8 Clases al mes', price: '8500' },
  { id: '4clases', name: '4 Clases al mes', price: '5000' },
  { id: 'clase_suelta', name: 'Clase Suelta', price: '2000' },
];

const RecordPaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
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
    <SafeAreaView style={styles.safeArea}>
      <VersatileHeader />
      <ScrollView contentContainerStyle={styles.container}>
        <Title style={styles.title}>Registrar Pago</Title>

        <Text style={styles.label}>1. Selecciona Alumno</Text>
        <Card style={styles.card}>
          <ScrollView style={{ maxHeight: 150 }}>
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

        <Text style={styles.label}>2. Selecciona Plan</Text>
        <View style={styles.planContainer}>
          {PLANS.map(p => (
            <TouchableOpacity 
              key={p.id} 
              style={[styles.planChip, selectedPlan?.id === p.id && styles.selectedPlanChip]}
              onPress={() => handleSelectPlan(p)}
            >
              <Text style={[styles.planChipText, selectedPlan?.id === p.id && styles.selectedPlanChipText]}>
                {p.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>3. Monto Abonado ($)</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          mode="outlined"
          keyboardType="numeric"
          style={styles.input}
          outlineColor={COLORS.lightGray}
          activeOutlineColor={COLORS.primary}
        />

        <Button
          mode="contained"
          onPress={handleRecord}
          loading={loading}
          style={styles.button}
          buttonColor={COLORS.primary}
        >
          Confirmar Pago
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

import { TouchableOpacity } from 'react-native';

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
  planContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  planChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  selectedPlanChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  planChipText: {
    fontSize: 12,
    color: COLORS.black,
  },
  selectedPlanChipText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: COLORS.white,
  },
  button: {
    marginTop: 30,
    paddingVertical: 8,
    borderRadius: 12,
  }
});

export default RecordPaymentScreen;
