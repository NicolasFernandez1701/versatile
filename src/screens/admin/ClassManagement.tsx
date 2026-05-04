import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, Alert } from 'react-native';
import { COLORS } from '../../theme/colors';
import VersatileHeader from '../../components/VersatileHeader';
import { supabase } from '../../api/supabaseClient';
import { Plus, Clock, Users, Trash2 } from 'lucide-react-native';
import { Button, Card, Title, Paragraph } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';

const ClassManagement = () => {
  const navigation = useNavigation<any>();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

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

  const getDayName = (day: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[day];
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <VersatileHeader />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Gestión de Clases</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => navigation.navigate('AddClass')}
          >
            <Plus color={COLORS.white} size={24} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <Card.Content>
                <View style={styles.cardHeader}>
                  <Title style={styles.className}>{item.activities?.name}</Title>
                  <TouchableOpacity onPress={() => console.log('Delete', item.id)}>
                    <Trash2 size={20} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
                <Paragraph style={styles.teacherName}>Prof: {item.profiles?.full_name || 'Sin asignar'}</Paragraph>
                
                <View style={styles.details}>
                  <View style={styles.detailItem}>
                    <Clock size={16} color={COLORS.gray} />
                    <Text style={styles.detailText}>{getDayName(item.day_of_week)} {item.start_time.slice(0, 5)}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Users size={16} color={COLORS.gray} />
                    <Text style={styles.detailText}>{item.capacity} cupos</Text>
                  </View>
                </View>
                
                <View style={styles.commissionTag}>
                  <Text style={styles.commissionText}>Comisión: {item.teacher_commission_pct}%</Text>
                </View>
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No hay clases creadas aún.</Text>
              <Button 
                mode="outlined" 
                onPress={() => {}} 
                style={styles.emptyButton}
                textColor={COLORS.primary}
              >
                Crear Primera Clase
              </Button>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.background,
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
    color: COLORS.black,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  card: {
    marginBottom: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  className: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  teacherName: {
    color: COLORS.gray,
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
    color: COLORS.gray,
  },
  commissionTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0EFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 12,
  },
  commissionText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    marginTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.gray,
    marginBottom: 20,
  },
  emptyButton: {
    borderColor: COLORS.primary,
  }
});

export default ClassManagement;
