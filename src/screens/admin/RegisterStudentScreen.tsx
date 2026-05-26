import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView } from 'react-native';
import { Title, TextInput, Button, Text } from 'react-native-paper';
import { createClient } from '@supabase/supabase-js';
import { useNavigation } from '@react-navigation/native';
import { ThemeContainer } from '../../components/ThemeContainer';
import { useThemeColors } from '../../hooks/useThemeColors';
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cdchqogglezxmkmiyper.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Cliente Supabase secundario no persistente para no alterar la sesión del administrador
const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

const RegisterStudentScreen = () => {
  const navigation = useNavigation();
  const colors = useThemeColors();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Versatile123!'); // Contraseña por defecto
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor, completa todos los campos.');
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
          }
        }
      });

      if (error) {
        Alert.alert('Error al registrar', error.message);
      } else {
        Alert.alert(
          'Éxito',
          `Alumno registrado correctamente.\n\nContraseña: ${password.trim()}\n\nYa puedes inscribirlo en clases y registrar sus pagos.`,
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
        <Title style={[styles.title, { color: colors.black }]}>Registrar Alumno</Title>
        <Text style={[styles.subtitle, { color: colors.gray }]}>
          Crea una nueva cuenta de alumno. Se generará su perfil automáticamente en el sistema.
        </Text>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.primary }]}>Nombre Completo</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Ej: Juan Pérez"
            placeholderTextColor={colors.gray}
            mode="outlined"
            left={<TextInput.Icon icon={() => <User size={20} color={colors.gray} />} />}
            style={[styles.input, { backgroundColor: colors.white }]}
            outlineColor={colors.lightGray}
            activeOutlineColor={colors.primary}
            textColor={colors.black}
          />

          <Text style={[styles.label, { color: colors.primary }]}>Correo Electrónico</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Ej: juan.perez@email.com"
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

          <Text style={[styles.label, { color: colors.primary }]}>Contraseña de Acceso</Text>
          <TextInput
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
            Contraseña temporal recomendada. Compártela con el alumno para su primer inicio de sesión.
          </Text>

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
            buttonColor={colors.primary}
            textColor="#FFFFFF"
          >
            Confirmar Registro
          </Button>
        </View>
      </ScrollView>
    </ThemeContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 25,
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    height: 50,
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
    lineHeight: 16,
  },
  button: {
    marginTop: 35,
    paddingVertical: 8,
    borderRadius: 12,
  },
});

export default RegisterStudentScreen;
