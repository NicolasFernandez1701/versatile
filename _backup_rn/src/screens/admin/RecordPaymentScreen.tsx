import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Title, Button, Text, TextInput, Card, List, SegmentedButtons, Switch, Divider } from 'react-native-paper';
import { supabase } from '../../api/supabaseClient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { format, addDays } from 'date-fns';
import { ThemeContainer } from '../../components/ThemeContainer';
import { useThemeColors } from '../../hooks/useThemeColors';

const RecordPaymentScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const colors = useThemeColors();
  const [loading, setLoading] = useState(false);
  
  const [students, setStudents] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(route.params?.studentId || null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'transferencia' | 'efectivo'>('transferencia');
  const [applyLateFee, setApplyLateFee] = useState(new Date().getDate() > 10);
  
  const [originalPrice, setOriginalPrice] = useState(0);
  const [promoDiscountAmount, setPromoDiscountAmount] = useState(0);
  const [cashDiscountAmount, setCashDiscountAmount] = useState(0);
  const [surchargeAmount, setSurchargeAmount] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);
  const [calculatedAmount, setCalculatedAmount] = useState(0);
  const [activePromo, setActivePromo] = useState<any | null>(null);

  const isAfterTen = new Date().getDate() > 10;

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    const { data: stds } = await supabase.from('profiles').select('*').eq('role', 'student');
    if (stds) setStudents(stds);

    const { data: plns } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });
    if (plns) setPlans(plns);
  };

  useEffect(() => {
    if (!selectedPlan) return;

    const basePrice = Number(selectedPlan.price);
    let promoDiscount = 0;
    let promoInfo = null;

    const student = students.find(s => s.id === selectedStudent);
    if (student && student.promotion_discount_pct > 0) {
      const expDate = student.promotion_expiration_date;
      const isPromoValid = !expDate || new Date(expDate) >= new Date();
      if (isPromoValid) {
        promoDiscount = basePrice * (student.promotion_discount_pct / 100);
        promoInfo = {
          pct: student.promotion_discount_pct,
          expiration: expDate,
        };
      }
    }
    setActivePromo(promoInfo);

    const priceAfterPromo = basePrice - promoDiscount;

    let cashDiscount = 0;
    if (paymentMethod === 'efectivo') {
      cashDiscount = priceAfterPromo * 0.15;
    }

    const currentTotalDiscount = promoDiscount + cashDiscount;
    const priceAfterDiscount = basePrice - currentTotalDiscount;

    let surcharge = 0;
    if (applyLateFee) {
      surcharge = priceAfterDiscount * 0.20;
    }

    const finalAmount = priceAfterDiscount + surcharge;

    setOriginalPrice(basePrice);
    setPromoDiscountAmount(promoDiscount);
    setCashDiscountAmount(cashDiscount);
    setTotalDiscount(currentTotalDiscount);
    setSurchargeAmount(surcharge);
    setCalculatedAmount(finalAmount);
    setAmount(finalAmount.toFixed(2));

  }, [selectedStudent, selectedPlan, paymentMethod, applyLateFee, students]);

  const handleSelectPlan = (plan: any) => {
    setSelectedPlan(plan);
  };

  const handleRecord = async () => {
    if (!selectedStudent || !selectedPlan || !amount) {
      Alert.alert('Error', 'Completa todos los campos.');
      return;
    }

    setLoading(true);
    
    const expirationDate = format(addDays(new Date(), 30), 'yyyy-MM-dd');
    const finalAmountParsed = parseFloat(amount);

    const { error: paymentError } = await supabase.from('payments').insert({
      student_id: selectedStudent,
      plan_id: selectedPlan.id,
      amount: finalAmountParsed,
      payment_date: format(new Date(), 'yyyy-MM-dd'),
      expiration_date: expirationDate,
      plan_details: `${selectedPlan.name} - $${finalAmountParsed.toFixed(2)} (${paymentMethod === 'efectivo' ? 'Efectivo' : 'Transf.'})`,
      payment_method: paymentMethod,
      original_amount: originalPrice,
      discount_applied: totalDiscount,
      surcharge_applied: surchargeAmount,
      late_payment: isAfterTen,
      late_fee_applied: applyLateFee,
    });

    if (paymentError) {
      Alert.alert('Error', paymentError.message);
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        plan_id: selectedPlan.id,
        plan_expiration_date: expirationDate,
      })
      .eq('id', selectedStudent);

    if (profileError) {
      Alert.alert('Error al actualizar membresía', profileError.message);
    } else {
      Alert.alert('Éxito', `Pago registrado correctamente.`);
      navigation.goBack();
    }
    setLoading(false);
  };

  return (
    <ThemeContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
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
          {plans.map(p => (
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

        {selectedPlan && (
          <>
            {activePromo && (
              <View style={[styles.promoAlert, { backgroundColor: colors.isDark ? '#1C3E2D' : '#E8F5E9', marginTop: 15 }]}>
                <List.Icon icon="star" color={colors.isDark ? '#66BB6A' : '#2E7D32'} style={{ margin: 0, marginRight: 8 }} />
                <Text style={[styles.promoAlertText, { color: colors.isDark ? '#66BB6A' : '#2E7D32', flex: 1 }]}>
                  ¡Promoción del alumno activa: Descuento del {activePromo.pct}% aplicado!
                  {activePromo.expiration ? ` (Vence el ${activePromo.expiration})` : ''}
                </Text>
              </View>
            )}

            <Text style={[styles.label, { color: colors.primary }]}>3. Método de Pago</Text>
            <SegmentedButtons
              value={paymentMethod}
              onValueChange={val => setPaymentMethod(val as any)}
              buttons={[
                { value: 'transferencia', label: 'Transferencia' },
                { value: 'efectivo', label: 'Efectivo (-15%)' },
              ]}
              style={styles.segmentedButtons}
              theme={{
                colors: {
                  secondaryContainer: colors.primary,
                  onSecondaryContainer: '#FFFFFF',
                  outline: colors.lightGray
                }
              }}
            />

            {isAfterTen && (
              <View style={styles.switchRow}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.switchLabel, { color: colors.black }]}>Recargo por Mora (+20%)</Text>
                  <Text style={[styles.switchSublabel, { color: colors.gray }]}>
                    {applyLateFee 
                      ? 'Cobro posterior al día 10. Recargo activo.' 
                      : 'Exonerado por aviso previo del alumno.'}
                  </Text>
                </View>
                <Switch
                  value={applyLateFee}
                  onValueChange={setApplyLateFee}
                  color={colors.primary}
                />
              </View>
            )}

            <Card style={[styles.summaryCard, { backgroundColor: colors.white, borderColor: colors.lightGray, shadowColor: colors.isDark ? 'transparent' : colors.black }]}>
              <Text style={[styles.summaryTitle, { color: colors.primary }]}>Desglose del Cobro</Text>
              
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabelText, { color: colors.gray }]}>Valor Plan Base:</Text>
                <Text style={[styles.summaryValueText, { color: colors.black }]}>${originalPrice.toFixed(2)}</Text>
              </View>

              {promoDiscountAmount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabelText, { color: colors.error }]}>Descuento Promo ({activePromo?.pct}%):</Text>
                  <Text style={[styles.summaryValueText, { color: colors.error }]}>-${promoDiscountAmount.toFixed(2)}</Text>
                </View>
              )}

              {cashDiscountAmount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabelText, { color: colors.error }]}>Descuento Efectivo (-15%):</Text>
                  <Text style={[styles.summaryValueText, { color: colors.error }]}>-${cashDiscountAmount.toFixed(2)}</Text>
                </View>
              )}

              {surchargeAmount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabelText, { color: colors.primary }]}>Recargo por Mora (+20%):</Text>
                  <Text style={[styles.summaryValueText, { color: colors.primary }]}>+${surchargeAmount.toFixed(2)}</Text>
                </View>
              )}

              <Divider style={[styles.divider, { backgroundColor: colors.lightGray }]} />

              <View style={styles.finalRow}>
                <Text style={[styles.finalLabelText, { color: colors.black }]}>Monto Recomendado:</Text>
                <Text style={[styles.finalValueText, { color: colors.primary }]}>${calculatedAmount.toFixed(2)}</Text>
              </View>
            </Card>

            <Text style={[styles.label, { color: colors.primary }]}>4. Monto Final Abonado ($)</Text>
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
          </>
        )}

        <Button
          mode="contained"
          onPress={handleRecord}
          loading={loading}
          style={styles.button}
          buttonColor={colors.primary}
          textColor="#FFFFFF"
          disabled={!selectedStudent || !selectedPlan}
        >
          Confirmar Pago
        </Button>
      </ScrollView>
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
    marginBottom: 30,
  },
  segmentedButtons: {
    marginVertical: 5,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 5,
    marginTop: 15,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  switchSublabel: {
    fontSize: 12,
    marginTop: 2,
  },
  summaryCard: {
    borderRadius: 14,
    padding: 15,
    marginTop: 18,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  summaryLabelText: {
    fontSize: 13,
  },
  summaryValueText: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 8,
  },
  finalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  finalLabelText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  finalValueText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  promoAlert: {
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoAlertText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default RecordPaymentScreen;
