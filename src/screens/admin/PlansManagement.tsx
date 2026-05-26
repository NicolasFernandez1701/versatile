import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Title, Text, Button, Card, TextInput, IconButton, Portal, Modal } from 'react-native-paper';
import { supabase } from '../../api/supabaseClient';
import { useThemeColors } from '../../hooks/useThemeColors';
import { Plus, Edit2, Trash2, X } from 'lucide-react-native';

interface Plan {
  id: string;
  name: string;
  price: number;
  classes_per_week: number;
  is_active: boolean;
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
  const [classesPerWeek, setClassesPerWeek] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('price', { ascending: true });

    if (error) {
      Alert.alert('Error', 'No se pudieron cargar los planes');
    } else {
      setPlans(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setClassesPerWeek('');
    setEditingPlan(null);
  };

  const handleOpenModal = (plan?: Plan) => {
    if (plan) {
      setEditingPlan(plan);
      setName(plan.name);
      setPrice(plan.price.toString());
      setClassesPerWeek(plan.classes_per_week.toString());
    } else {
      resetForm();
    }
    setModalVisible(true);
  };

  const handleSavePlan = async () => {
    if (!name || !price || !classesPerWeek) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    const planData = {
      name,
      price: parseFloat(price),
      classes_per_week: parseInt(classesPerWeek),
    };

    if (editingPlan) {
      const { error } = await supabase
        .from('plans')
        .update(planData)
        .eq('id', editingPlan.id);

      if (error) Alert.alert('Error', 'No se pudo actualizar el plan');
      else {
        Alert.alert('Éxito', 'Plan actualizado correctamente');
        setModalVisible(false);
        fetchPlans();
      }
    } else {
      const { error } = await supabase
        .from('plans')
        .insert([planData]);

      if (error) Alert.alert('Error', 'No se pudo crear el plan');
      else {
        Alert.alert('Éxito', 'Plan creado correctamente');
        setModalVisible(false);
        fetchPlans();
      }
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
          <Text style={[styles.planClasses, { color: colors.gray }]}>{item.classes_per_week} clases por semana</Text>
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
            
            <TextInput
              label="Nombre del Plan (ej: Pase Libre)"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={[styles.input, { backgroundColor: colors.white }]}
              textColor={colors.black}
              outlineColor={colors.lightGray}
              activeOutlineColor={colors.primary}
            />
            <TextInput
              label="Precio Mensual ($)"
              value={price}
              onChangeText={setPrice}
              mode="outlined"
              keyboardType="numeric"
              style={[styles.input, { backgroundColor: colors.white }]}
              textColor={colors.black}
              outlineColor={colors.lightGray}
              activeOutlineColor={colors.primary}
            />
            <TextInput
              label="Clases por semana"
              value={classesPerWeek}
              onChangeText={setClassesPerWeek}
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
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '900',
    marginVertical: 4,
  },
  planClasses: {
    fontSize: 14,
  },
  planActions: {
    flexDirection: 'row',
  },
  modal: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
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
    marginTop: 10,
    paddingVertical: 4,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
  },
});

export default PlansManagement;
