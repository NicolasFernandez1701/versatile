import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import VersatileHeader from '../../components/VersatileHeader';
import { supabase } from '../../api/supabaseClient';
import { CreditCard, Calendar as CalendarIcon, CheckCircle, User, Phone, Save } from 'lucide-react-native';
import { TextInput, Button } from 'react-native-paper';
import { useAuthStore } from '../../store/useAuthStore';

const StudentDashboard = () => {
  const { profile, fetchProfile } = useAuthStore();
  const [membership, setMembership] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);

  // Estado para edición de perfil propio
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone(profile.phone || '');
    }
  }, [profile]);

  const fetchStudentData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: paymentData } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', user.id)
      .order('expiration_date', { ascending: false })
      .limit(1);

    if (paymentData?.[0]) setMembership(paymentData[0]);

    const { data: enrollmentData } = await supabase
      .from('enrollments')
      .select('*, classes(*)')
      .eq('student_id', user.id);

    if (enrollmentData) setClasses(enrollmentData);
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío.');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq('id', profile?.id);

    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      // Refrescar el perfil en el store
      if (profile?.id) await fetchProfile(profile.id);
      setEditMode(false);
      Alert.alert('¡Listo!', 'Tu perfil fue actualizado.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <VersatileHeader />
      <ScrollView contentContainerStyle={styles.container}>

        {/* Mi Plan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mi Plan</Text>
          <View style={styles.planCard}>
            <View style={styles.planInfo}>
              <CreditCard color={COLORS.primary} size={24} />
              <View style={styles.planTextContainer}>
                <Text style={styles.planName}>{membership?.plan_details || 'Sin Plan Activo'}</Text>
                <Text style={styles.planDate}>Vence el: {membership?.expiration_date || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{membership ? 'Al Día' : 'Pendiente'}</Text>
            </View>
          </View>
        </View>

        {/* Mis Clases */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mis Clases</Text>
          {classes.length > 0 ? (
            classes.map((item) => (
              <View key={item.id} style={styles.classItem}>
                <CalendarIcon size={20} color={COLORS.secondary} />
                <View style={styles.classInfo}>
                  <Text style={styles.className}>{item.classes?.activity_name}</Text>
                  <Text style={styles.classSchedule}>
                    {item.classes?.start_time} - {item.classes?.end_time}
                  </Text>
                </View>
                <CheckCircle size={20} color={COLORS.success} />
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Aún no estás anotado en ninguna clase.</Text>
            </View>
          )}
        </View>

        {/* Mi Perfil — edición propia */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mi Perfil</Text>
            {!editMode && (
              <TouchableOpacity onPress={() => setEditMode(true)} style={styles.editButton}>
                <User size={14} color={COLORS.primary} />
                <Text style={styles.editButtonText}>Editar</Text>
              </TouchableOpacity>
            )}
          </View>

          {!editMode ? (
            <View style={styles.profileCard}>
              <View style={styles.profileRow}>
                <User size={16} color={COLORS.gray} />
                <Text style={styles.profileValue}>{profile?.full_name || 'Sin nombre'}</Text>
              </View>
              <View style={styles.profileRow}>
                <Phone size={16} color={COLORS.gray} />
                <Text style={styles.profileValue}>{profile?.phone || 'Sin teléfono cargado'}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.editForm}>
              <TextInput
                label="Nombre Completo"
                value={fullName}
                onChangeText={setFullName}
                mode="outlined"
                outlineColor={COLORS.lightGray}
                activeOutlineColor={COLORS.primary}
                textColor={COLORS.black}
                style={styles.input}
              />
              <TextInput
                label="Teléfono / WhatsApp"
                value={phone}
                onChangeText={setPhone}
                mode="outlined"
                keyboardType="phone-pad"
                placeholder="+5491123456789"
                outlineColor={COLORS.lightGray}
                activeOutlineColor={COLORS.primary}
                textColor={COLORS.black}
                style={styles.input}
              />
              <View style={styles.editActions}>
                <Button
                  mode="outlined"
                  onPress={() => { setEditMode(false); setFullName(profile?.full_name || ''); setPhone(profile?.phone || ''); }}
                  textColor={COLORS.gray}
                  style={[styles.cancelBtn, { borderColor: COLORS.lightGray }]}
                >
                  Cancelar
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveProfile}
                  loading={saving}
                  buttonColor={COLORS.primary}
                  textColor="#FFFFFF"
                  style={styles.saveBtn}
                  icon={() => <Save size={16} color="#FFFFFF" />}
                >
                  Guardar
                </Button>
              </View>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    padding: 20,
    backgroundColor: COLORS.background,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planTextContainer: {
    marginLeft: 15,
  },
  planName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  planDate: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: 'bold',
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  classInfo: {
    flex: 1,
    marginLeft: 15,
  },
  className: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.black,
  },
  classSchedule: {
    fontSize: 12,
    color: COLORS.gray,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.gray,
    textAlign: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F0EFFF',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    gap: 12,
    elevation: 1,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  profileValue: {
    fontSize: 15,
    color: COLORS.black,
  },
  editForm: {
    gap: 12,
  },
  input: {
    backgroundColor: COLORS.white,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
  },
  saveBtn: {
    flex: 1,
    borderRadius: 10,
  },
});

export default StudentDashboard;
