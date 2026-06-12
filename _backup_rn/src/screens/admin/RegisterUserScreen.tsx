import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { Title, TextInput, Button, Text, SegmentedButtons } from 'react-native-paper';
import { createClient } from '@supabase/supabase-js';
import { useNavigation } from '@react-navigation/native';
import { ThemeContainer } from '../../components/ThemeContainer';
import { useThemeColors } from '../../hooks/useThemeColors';
import { Eye, EyeOff, User, Mail, Lock, Phone, Shield } from 'lucide-react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cdchqogglezxmkmiyper.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente secundario sin persistir sesión para no afectar la sesión del admin activo
const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

type Role = 'student' | 'teacher' | 'admin';

const ROLES: { value: Role; label: string; description: string }[] = [
  { value: 'student', label: 'Alumno', description: 'Accede a su dashboard y clases' },
  { value: 'teacher', label: 'Profesora', description: 'Gestiona su agenda y asistencias' },
  { value: 'admin', label: 'Admin', description: 'Acceso completo al sistema' },
];

const RegisterUserScreen = () => {
  const navigation = useNavigation();
  const colors = useThemeColors();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('Versatile123!');
  const [selectedRole, setSelectedRole] = useState<Role>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor, completa los campos obligatorios (Nombre, Email y Contraseña).');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await tempSupabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: selectedRole,
          },
        },
      });

      if (error) {
        Alert.alert('Error al registrar', error.message);
      } else {
        const roleLabel = ROLES.find(r => r.value === selectedRole)?.label || selectedRole;
        Alert.alert(
          '¡Usuario creado!',
          `${fullName.trim()} fue registrado como ${roleLabel}.\n\nContraseña temporal: ${password.trim()}\n\nCompartí estos datos con el usuario para su primer ingreso.`,
          [{ text: 'Entendido', onPress: () => navigation.goBack() }]
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeContainer>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Selector de Rol */}
        <Text style={[styles.label, { color: colors.primary }]}>Rol del Usuario</Text>
        <SegmentedButtons
          value={selectedRole}
          onValueChange={value => setSelectedRole(value as Role)}
          buttons={[
            {
              value: 'student',
              label: 'Alumno',
              showSelectedCheck: true,
            },
            {
              value: 'teacher',
              label: 'Profesora',
              showSelectedCheck: true,
            },
            {
              value: 'admin',
              label: 'Admin',
              showSelectedCheck: true,
            },
          ]}
          style={styles.segmentedButtons}
        />

        <View style={styles.form}>
          <TextInput
            label="Nombre Completo *"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Ej: María García"
            placeholderTextColor={colors.gray}
            mode="outlined"
            left={<TextInput.Icon icon={() => <User size={20} color={colors.gray} />} />}
            style={[styles.input, { backgroundColor: colors.white }]}
            outlineColor={colors.lightGray}
            activeOutlineColor={colors.primary}
            textColor={colors.black}
          />

          <TextInput
            label="Email *"
            value={email}
            onChangeText={setEmail}
            placeholder="Ej: maria@email.com"
            placeholderTextColor={colors.gray}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon={() => <Mail size={20} color={colors.gray} />} />}
            style={[styles.input, { backgroundColor: colors.white }]}
            outlineColor={colors.lightGray}
            activeOutlineColor={colors.primary}
            textColor={colors.black}
          />

          <TextInput
            label="Teléfono / WhatsApp (Opcional)"
            value={phone}
            onChangeText={setPhone}
            placeholder="Ej: +5491123456789"
            placeholderTextColor={colors.gray}
            mode="outlined"
            keyboardType="phone-pad"
            left={<TextInput.Icon icon={() => <Phone size={20} color={colors.gray} />} />}
            style={[styles.input, { backgroundColor: colors.white }]}
            outlineColor={colors.lightGray}
            activeOutlineColor={colors.primary}
            textColor={colors.black}
          />

          <View>
            <TextInput
              label="Contraseña Temporal *"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              left={<TextInput.Icon icon={() => <Lock size={20} color={colors.gray} />} />}
              right={
                <TextInput.Icon
                  icon={() => showPassword ? <EyeOff size={20} color={colors.gray} /> : <Eye size={20} color={colors.gray} />}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={[styles.input, { backgroundColor: colors.white }]}
              outlineColor={colors.lightGray}
              activeOutlineColor={colors.primary}
              textColor={colors.black}
            />
            <Text style={[styles.hint, { color: colors.gray }]}>
              Compartí esta contraseña temporal con el usuario.
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
          >
            Crear Usuario
          </Button>
        </View>
      </ScrollView>
    </ThemeContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
  },
  segmentedButtons: {
    marginVertical: 4,
  },
  form: {
    width: '100%',
    marginTop: 8,
    gap: 10,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    height: 48,
  },
  hint: {
    fontSize: 11,
    marginTop: 4,
    lineHeight: 14,
  },
  button: {
    marginTop: 15,
    paddingVertical: 4,
    borderRadius: 12,
  },
});

export default RegisterUserScreen;
