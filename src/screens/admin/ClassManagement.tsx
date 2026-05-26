import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../../api/supabaseClient';
import { Plus, Clock, Users, Trash2, Edit2 } from 'lucide-react-native';
import { Card, Title, Paragraph } from 'react-native-paper';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { ThemeContainer } from '../../components/ThemeContainer';
import { useThemeColors } from '../../hooks/useThemeColors';

const ClassManagement = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const colors = useThemeColors();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isFocused) {
      fetchClasses();
    }
  }, [isFocused]);

  const fetchClasses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('classes')
      .select('*, activities(name), profiles(full_name)')
      .order('day_of_week', { ascending: true });

    if (error) console.error(error);
    else setClasses(data || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Confirmar',
      '¿Estás seguro de que quieres eliminar esta clase?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('classes').delete().eq('id', id);
            if (!error) fetchClasses();
            else Alert.alert('Error', error.message);
          }
        }
      ]
    );
  };

  const getDayName = (day: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[day];
  };

  return (
    <ThemeContainer scrollable={false}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.black }]}>Gestión de Clases</Text>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('AddClass')}
        >
          <Plus color="#FFFFFF" size={24} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={[styles.card, { backgroundColor: colors.white, shadowColor: colors.isDark ? 'transparent' : colors.black }]}>
            <Card.Content>
              <View style={styles.cardHeader}>
                <Title style={[styles.className, { color: colors.primary }]}>{item.activities?.name}</Title>
                <View style={styles.headerActions}>
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('EditClass', { classId: item.id })}
                    style={{ marginRight: 15 }}
                  >
                    <Edit2 size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item.id)}>
                    <Trash2 size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
              <Paragraph style={[styles.teacherName, { color: colors.gray }]}>Prof: {item.profiles?.full_name || 'Sin asignar'}</Paragraph>
              
              <View style={styles.details}>
                <View style={styles.detailItem}>
                  <Clock size={16} color={colors.gray} />
                  <Text style={[styles.detailText, { color: colors.gray }]}>{getDayName(item.day_of_week)} {item.start_time.slice(0, 5)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Users size={16} color={colors.gray} />
                  <Text style={[styles.detailText, { color: colors.gray }]}>{item.capacity} cupos</Text>
                </View>
              </View>
              
              <View style={[styles.commissionTag, { backgroundColor: colors.isDark ? '#2A2740' : '#F0EFFF' }]}>
                <Text style={[styles.commissionText, { color: colors.primary }]}>Comisión: {item.teacher_commission_pct}%</Text>
              </View>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ color: colors.gray, marginBottom: 20 }}>No hay clases creadas aún.</Text>
          </View>
        }
        refreshing={loading}
        onRefresh={fetchClasses}
      />
    </ThemeContainer>
  );
};

const styles = StyleSheet.create({
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
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  className: {
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teacherName: {
    fontSize: 14,
    marginTop: -4,
  },
  details: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    marginLeft: 6,
    fontSize: 13,
  },
  commissionTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 12,
  },
  commissionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
  },
});

export default ClassManagement;
