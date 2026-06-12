import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Title, Text, Button, Card, TextInput, IconButton, Portal, Modal, Divider, List } from 'react-native-paper';
import { supabase } from '../../api/supabaseClient';
import { useThemeColors } from '../../hooks/useThemeColors';
import { Plus, Edit2, Trash2, X, Trash } from 'lucide-react-native';

interface PlanActivity {
  id?: string;
  activity_name: string;
  classes_per_week: number;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  classes_per_week: number;
  is_active: boolean;
  activities?: PlanActivity[];
}

const PlansManagement = () => {
  const colors = useThemeColors();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [planActivities, setPlanActivities] = useState<PlanActivity[]>([]);

  // List of available activities from database to suggest
  const [availableActivities, setAvailableActivities] = useState<string[]>([]);
  const [showActivityPickerIdx, setShowActivityPickerIdx] = useState<number | null>(null);

  useEffect(() => {
    fetchPlans();
    fetchAvailableActivities();
  }, []);

  const fetchAvailableActivities = async () => {
    const { data } = await supabase.from('classes').select('activity_name');
    if (data) {
      const unique = Array.from(new Set(data.map((c: any) => c.activity_name))) as string[];
      setAvailableActivities(unique);
    }
  };

  const fetchPlans = async () => {
    setLoading(true);
    // 1. Fetch main plan records
    const { data: plansData, error: plansError } = await supabase
      .from('plans')
      .select('*')
      .order('price', { ascending: true });

    if (plansError) {
      Alert.alert('Error', 'No se pudieron cargar los planes');
      setLoading(false);
      return;
    }

    // 2. Fetch corresponding activities composition
    const { data: activitiesData } = await supabase
      .from('plan_activities')
      .select('*');

    const mappedPlans = (plansData || []).map((plan: any) => {
      const activities = (activitiesData || []).filter((act: any) => act.plan_id === plan.id);
      return {
        ...plan,
        activities: activities.map(a => ({ id: a.id, activity_name: a.activity_name, classes_per_week: a.classes_per_week }))
      };
    });

    setPlans(mappedPlans);
    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setPlanActivities([]);
    setEditingPlan(null);
  };

  const handleOpenModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setName(plan.name);
      setPrice(plan.price.toString());
      setPlanActivities(plan.activities || []);
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const handleAddActivityRow = () => {
    setPlanActivities(prev => [...prev, { activity_name: '', classes_per_week: 1 }]);
  };

  const handleRemoveActivityRow = (index: number) => {
    setPlanActivities(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateActivityRow = (index: number, key: keyof PlanActivity, val: any) => {
    setPlanActivities(prev => prev.map((act, i) => {
      if (i === index) {
        return { ...act, [key]: val };
      }
      return act;
    }));
  };

  // Compute calculated base price from class base prices
  const calculateSuggestedPrice = async () => {
    if (planActivities.length === 0) return;
    
    // Fetch base prices for the selected activities
    const { data } = await supabase
      .from('classes')
      .select('activity_name, base_price');

    if (data) {
      // Map activity name to its base price (using average if multiple schedules exist)
      const basePricesMap: Record<string, number> = {};
      data.forEach((c: any) => {
        basePricesMap[c.activity_name.toLowerCase()] = Number(c.base_price);
      });

      let sum = 0;
      planActivities.forEach(act => {
        const nameKey = act.activity_name.trim().toLowerCase();
        const pricePerClass = basePricesMap[nameKey] || 5000; // default 5000 if not found
        // Weekly classes * 4 weeks in a month
        sum += pricePerClass * act.classes_per_week * 4;
      });

      setPrice(sum.toString());
      Alert.alert('Sugerencia', `Precio calculado sugerido en base a clases mensuales: $${sum}`);
    } else {
      Alert.alert('Info', 'No se encontraron clases para calcular precio sugerido');
    }
  };

  const handleSavePlan = async () => {
    if (!name || !price) {
      Alert.alert('Error', 'Por favor completa los campos principales');
      return;
    }

    const totalClasses = planActivities.reduce((acc, act) => acc + Number(act.classes_per_week), 0);

    const planData = {
      name,
      price: parseFloat(price),
      classes_per_week: totalClasses,
    };

    try {
      if (editingPlan) {
        // 1. Update plan
        const { error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;

        // 2. Delete existing activities and insert new composition
        await supabase.from('plan_activities').delete().eq('plan_id', editingPlan.id);
        
        if (planActivities.length > 0) {
          const insertPayload = planActivities.map(pa => ({
            plan_id: editingPlan.id,
            activity_name: pa.activity_name.trim(),
            classes_per_week: Number(pa.classes_per_week)
          }));
          const { error: insertError } = await supabase.from('plan_activities').insert(insertPayload);
          if (insertError) throw insertError;
        }

        Alert.alert('Éxito', 'Plan actualizado correctamente');
      } else {
        // 1. Insert plan
        const { data, error } = await supabase
          .from('plans')
          .insert([planData])
          .select()
          .single();

        if (error) throw error;

        // 2. Insert activities composition
        if (data && planActivities.length > 0) {
          const insertPayload = planActivities.map(pa => ({
            plan_id: data.id,
            activity_name: pa.activity_name.trim(),
            classes_per_week: Number(pa.classes_per_week)
          }));
          const { error: insertError } = await supabase.from('plan_activities').insert(insertPayload);
          if (insertError) throw insertError;
        }

        Alert.alert('Éxito', 'Plan creado correctamente');
      }

      setModalVisible(false);
      fetchPlans();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo guardar el plan');
    }
  };

  const handleDeletePlan = (id: string) => {
    Alert.alert(
      'Eliminar Plan',
      '¿Estás seguro de que quieres eliminar este plan? Los alumnos inscritos podrían verse afectados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('plans')
              .delete()
              .eq('id', id);
            
            if (error) Alert.alert('Error', 'No se pudo eliminar el plan');
            else fetchPlans();
          }
        }
      ]
    );
  };

  const renderPlanItem = ({ item }: { item: Plan }) => (
    <Card style={[styles.planCard, { backgroundColor: colors.white, shadowColor: colors.isDark ? 'transparent' : colors.black }]}>
      <Card.Content style={styles.planContent}>
        <View style={styles.planInfo}>
          <Title style={[styles.planName, { color: colors.black }]}>{item.name}</Title>
          <Text style={[styles.planPrice, { color: colors.primary }]}>${item.price}</Text>
          {item.activities && item.activities.length > 0 ? (
            item.activities.map((act, i) => (
              <Text key={i} style={[styles.planClasses, { color: colors.gray }]}>
                • {act.classes_per_week} clase(s) de {act.activity_name} / sem
              </Text>
            ))
          ) : (
            <Text style={[styles.planClasses, { color: colors.gray }]}>{item.classes_per_week} clases por semana (genérico)</Text>
          )}
        </View>
        <View style={styles.planActions}>
          <IconButton 
            icon={() => <Edit2 size={20} color={colors.primary} />} 
            onPress={() => handleOpenModal(item)}
          />
          <IconButton 
            icon={() => <Trash2 size={20} color={colors.error} />} 
            onPress={() => handleDeletePlan(item.id)}
          />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.white }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Title style={[styles.title, { color: colors.black }]}>Planes de Pago</Title>
          <Button 
            mode="contained" 
            onPress={() => handleOpenModal()} 
            icon={() => <Plus color="#FFFFFF" size={18} />}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
          >
            Nuevo Plan
          </Button>
        </View>

        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          renderItem={renderPlanItem}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={fetchPlans}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: colors.gray }]}>No has creado ningún plan todavía.</Text>
              </View>
            ) : null
          }
        />

        <Portal>
          <Modal
            visible={modalVisible}
            onDismiss={() => setModalVisible(false)}
            contentContainerStyle={[styles.modal, { backgroundColor: colors.white }]}
          >
            <View style={styles.modalHeader}>
              <Title style={{ color: colors.black }}>{editingPlan ? 'Editar Plan' : 'Nuevo Plan'}</Title>
              <IconButton 
                icon={() => <X size={24} color={colors.gray} />} 
                onPress={() => setModalVisible(false)} 
              />
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: '80%' }}>
              <TextInput
                label="Nombre del Plan (ej: Intermedio A)"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={[styles.input, { backgroundColor: colors.white }]}
                textColor={colors.black}
                outlineColor={colors.lightGray}
                activeOutlineColor={colors.primary}
              />

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 5 }}>
                <Text style={{ fontSize: 15, fontWeight: 'bold', color: colors.black }}>Clases y Actividades</Text>
                <Button 
                  mode="outlined" 
                  compact 
                  onPress={handleAddActivityRow}
                  textColor={colors.primary}
                  style={{ borderColor: colors.primary }}
                >
                  + Agregar
                </Button>
              </View>

              {planActivities.map((act, index) => (
                <View key={index} style={styles.activityRow}>
                  <View style={{ flex: 2, marginRight: 8 }}>
                    <TextInput
                      placeholder="Actividad (ej: Stretching)"
                      value={act.activity_name}
                      onChangeText={val => handleUpdateActivityRow(index, 'activity_name', val)}
                      mode="outlined"
                      dense
                      style={{ backgroundColor: colors.white, height: 40 }}
                      textColor={colors.black}
                      outlineColor={colors.lightGray}
                      activeOutlineColor={colors.primary}
                      right={
                        availableActivities.length > 0 ? (
                          <TextInput.Icon 
                            icon="chevron-down" 
                            onPress={() => setShowActivityPickerIdx(showActivityPickerIdx === index ? null : index)} 
                          />
                        ) : undefined
                      }
                    />

                    {showActivityPickerIdx === index && (
                      <Card style={styles.suggestionsCard}>
                        {availableActivities.map(name => (
                          <TouchableOpacity 
                            key={name} 
                            style={styles.suggestionItem}
                            onPress={() => {
                              handleUpdateActivityRow(index, 'activity_name', name);
                              setShowActivityPickerIdx(null);
                            }}
                          >
                            <Text style={{ color: colors.black }}>{name}</Text>
                          </TouchableOpacity>
                        ))}
                      </Card>
                    )}
                  </View>

                  <View style={{ flex: 1, marginRight: 8 }}>
                    <TextInput
                      placeholder="Cant/Sem"
                      value={act.classes_per_week.toString()}
                      onChangeText={val => handleUpdateActivityRow(index, 'classes_per_week', val)}
                      mode="outlined"
                      keyboardType="numeric"
                      dense
                      style={{ backgroundColor: colors.white, height: 40 }}
                      textColor={colors.black}
                      outlineColor={colors.lightGray}
                      activeOutlineColor={colors.primary}
                    />
                  </View>

                  <IconButton 
                    icon={() => <Trash size={18} color={colors.error} />}
                    onPress={() => handleRemoveActivityRow(index)}
                    style={{ margin: 0, padding: 0 }}
                  />
                </View>
              ))}

              {planActivities.length > 0 && (
                <Button 
                  mode="text" 
                  onPress={calculateSuggestedPrice}
                  textColor={colors.primary}
                  style={{ alignSelf: 'flex-end', marginTop: 5 }}
                >
                  Sugerir Precio
                </Button>
              )}

              <Divider style={{ marginVertical: 12 }} />

              <TextInput
                label="Precio Mensual Final ($)"
                value={price}
                onChangeText={setPrice}
                mode="outlined"
                keyboardType="numeric"
                style={[styles.input, { backgroundColor: colors.white }]}
                textColor={colors.black}
                outlineColor={colors.lightGray}
                activeOutlineColor={colors.primary}
              />

              <Button 
                mode="contained" 
                onPress={handleSavePlan}
                style={styles.saveButton}
                buttonColor={colors.primary}
                textColor="#FFFFFF"
              >
                Guardar Plan
              </Button>
            </ScrollView>
          </Modal>
        </Portal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  list: {
    paddingBottom: 20,
  },
  planCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 3,
  },
  planContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '900',
    marginVertical: 4,
  },
  planClasses: {
    fontSize: 14,
    marginTop: 2,
  },
  planActions: {
    flexDirection: 'row',
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  input: {
    marginBottom: 12,
  },
  saveButton: {
    marginTop: 15,
    paddingVertical: 4,
    marginBottom: 15,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
    zIndex: 10,
  },
  suggestionsCard: {
    position: 'absolute',
    top: 42,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 999,
    elevation: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
});

export default PlansManagement;
