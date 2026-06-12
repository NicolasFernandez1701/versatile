import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { supabase } from '../../api/supabaseClient';
import { Plus, Clock, Users, Trash2, Edit2, Phone, Mail, User } from 'lucide-react-native';
import { Card, Title, Paragraph, Portal, Modal, List, ActivityIndicator, Divider } from 'react-native-paper';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { ThemeContainer } from '../../components/ThemeContainer';
import { useThemeColors } from '../../hooks/useThemeColors';

const ClassManagement = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const colors = useThemeColors();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para modal de alumnos inscriptos
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);

  useEffect(() => {
    if (isFocused) {
      fetchClasses();
    }
  }, [isFocused]);

  const fetchClasses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('classes')
      .select('*, profiles(full_name), enrollments(count)')
      .order('day_of_week', { ascending: true });

    if (error) console.error(error);
    else setClasses(data || []);
    setLoading(false);
  };

  const fetchEnrolledStudents = async (classId: string) => {
    setLoadingStudents(true);
    const { data, error } = await supabase
      .from('enrollments')
      .select('id, profiles(id, full_name, email, phone)')
      .eq('class_id', classId);

    if (error) {
      console.error('Error fetching enrolled students:', error);
      setEnrolledStudents([]);
    } else {
      setEnrolledStudents(data || []);
    }
    setLoadingStudents(false);
  };

  const handleOpenStudentsModal = (cls: any) => {
    setSelectedClass(cls);
    setShowStudentsModal(true);
    fetchEnrolledStudents(cls.id);
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
          <Card 
            onPress={() => handleOpenStudentsModal(item)}
            style={[styles.card, { backgroundColor: colors.white, shadowColor: colors.isDark ? 'transparent' : colors.black }]}
          >
            <Card.Content>
              <View style={styles.cardHeader}>
                <Title style={[styles.className, { color: colors.primary }]}>{item.activity_name}</Title>
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
                  <Text style={[styles.detailText, { color: colors.gray }]}>
                    {item.enrollments?.[0]?.count || 0} / {item.capacity} cupos
                  </Text>
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

      <Portal>
        <Modal 
          visible={showStudentsModal} 
          onDismiss={() => {
            setShowStudentsModal(false);
            setSelectedClass(null);
            setEnrolledStudents([]);
          }} 
          contentContainerStyle={[styles.bottomSheet, { backgroundColor: colors.white }]}
        >
          <View style={styles.sheetHeader}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.lightGray }]} />
            <Title style={[styles.sheetTitle, { color: colors.black }]}>
              {selectedClass?.activity_name || 'Alumnos Inscriptos'}
            </Title>
            <Text style={{ color: colors.gray, fontSize: 13, marginTop: 2 }}>
              Día: {selectedClass ? getDayName(selectedClass.day_of_week) : ''} | Horario: {selectedClass ? `${selectedClass.start_time.slice(0, 5)} - ${selectedClass.end_time.slice(0, 5)}` : ''}
            </Text>
          </View>

          {loadingStudents ? (
            <View style={styles.sheetLoader}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.gray, marginTop: 10 }}>Cargando lista de alumnos...</Text>
            </View>
          ) : (
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {enrolledStudents.length === 0 ? (
                <View style={styles.sheetEmptyState}>
                  <Text style={{ color: colors.gray, textAlign: 'center', marginVertical: 20 }}>
                    No hay alumnos inscriptos en esta clase aún.
                  </Text>
                </View>
              ) : (
                enrolledStudents.map((item, index) => {
                  const student = item.profiles;
                  if (!student) return null;
                  return (
                    <View key={item.id} style={{ marginBottom: 12 }}>
                      {index > 0 && <Divider style={{ marginBottom: 12, backgroundColor: colors.lightGray }} />}
                      <View style={styles.studentRow}>
                        <View style={[styles.studentIconContainer, { backgroundColor: colors.isDark ? '#2A2740' : '#F0EFFF' }]}>
                          <User size={20} color={colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.studentNameText, { color: colors.black }]}>
                            {student.full_name}
                          </Text>
                          {student.email && (
                            <View style={styles.studentInfoItem}>
                              <Mail size={12} color={colors.gray} style={{ marginRight: 5 }} />
                              <Text style={[styles.studentInfoText, { color: colors.gray }]}>
                                {student.email}
                              </Text>
                            </View>
                          )}
                          {student.phone && (
                            <View style={styles.studentInfoItem}>
                              <Phone size={12} color={colors.gray} style={{ marginRight: 5 }} />
                              <Text style={[styles.studentInfoText, { color: colors.gray }]}>
                                {student.phone}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </Modal>
      </Portal>
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
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '70%',
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
    paddingBottom: 20,
  },
  sheetLoader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  sheetEmptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  studentNameText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  studentInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  studentInfoText: {
    fontSize: 13,
  },
});

export default ClassManagement;
