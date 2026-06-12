import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Title, TextInput, Button, Text, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ThemeContainer } from '../../components/ThemeContainer';
import { useThemeColors } from '../../hooks/useThemeColors';
import { User, Phone, Shield, Save } from 'lucide-react-native';
import { supabase } from '../../api/supabaseClient';

type Role = 'student' | 'teacher' | 'admin';

const ROLES: { value: Role; label: string; color: string }[] = [
  { value: 'student', label: 'Alumno', color: '#2E7D32' },
  { value: 'teacher', label: 'Profesora', color: '#1565C0' },
  { value: 'admin', label: 'Admin', color: '#6A1B9A' },
];

const EditUserProfileScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const colors = useThemeColors();

  const { userId } = route.params as { userId: string };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('student');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      Alert.alert('Error', 'No se pudo cargar el perfil del usuario.');
      navigation.goBack();
      return;
    }

    setFullName(data.full_name || '');
    setPhone(data.phone || '');
    setEmail(data.email || '');
    setSelectedRole(data.role as Role);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        role: selectedRole,
      })
      .eq('id', userId);

    setSaving(false);

    if (error) {
      Alert.alert('Error al guardar', error.message);
    } else {
      Alert.alert(
        'Guardado',
        'El perfil fue actualizado correctamente.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ThemeContainer>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Title style={[styles.title, { color: colors.black }]}>Editar Perfil</Title>

        {/* Email (solo lectura) */}
        {email ? (
          <View style={[styles.emailRow, { backgroundColor: colors.isDark ? '#1E1E2E' : '#F5F5F5', borderColor: colors.lightGray }]}>
            <Shield size={16} color={colors.gray} />
            <Text style={[styles.emailText, { color: colors.gray }]}>{email}</Text>
          </View>
        ) : null}

        {/* Selector de Rol */}
        <Text style={[styles.label, { color: colors.primary }]}>Rol</Text>
        <View style={styles.roleRow}>
          {ROLES.map(role => {
            const isSelected = selectedRole === role.value;
            return (
              <TouchableOpacity
                key={role.value}
                onPress={() => setSelectedRole(role.value)}
                style={[
                  styles.roleChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.white,
                    borderColor: isSelected ? colors.primary : colors.lightGray,
                  },
                ]}
              >
                <Text style={[styles.roleChipLabel, { color: isSelected ? '#FFFFFF' : colors.black }]}>
                  {role.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Nombre */}
        <Text style={[styles.label, { color: colors.primary }]}>Nombre Completo</Text>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          mode="outlined"
          left={<TextInput.Icon icon={() => <User size={20} color={colors.gray} />} />}
          style={[styles.input, { backgroundColor: colors.white }]}
          outlineColor={colors.lightGray}
          activeOutlineColor={colors.primary}
          textColor={colors.black}
        />

        {/* Teléfono */}
        <Text style={[styles.label, { color: colors.primary }]}>Teléfono / WhatsApp</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="+5491123456789"
          placeholderTextColor={colors.gray}
          mode="outlined"
          keyboardType="phone-pad"
          left={<TextInput.Icon icon={() => <Phone size={20} color={colors.gray} />} />}
          style={[styles.input, { backgroundColor: colors.white }]}
          outlineColor={colors.lightGray}
          activeOutlineColor={colors.primary}
          textColor={colors.black}
        />

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.button}
          buttonColor={colors.primary}
          textColor="#FFFFFF"
          icon={() => <Save size={18} color="#FFFFFF" />}
        >
          Guardar Cambios
        </Button>
      </ScrollView>
    </ThemeContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  emailText: {
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  roleChipLabel: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  input: {
    height: 50,
  },
  button: {
    marginTop: 35,
    paddingVertical: 8,
    borderRadius: 12,
  },
});

export default EditUserProfileScreen;
