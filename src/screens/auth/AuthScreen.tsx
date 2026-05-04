import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, Title } from 'react-native-paper';
import { supabase } from '../../api/supabaseClient';
import { COLORS } from '../../theme/colors';
import VersatileHeader from '../../components/VersatileHeader';

const AuthScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert('Error', error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) Alert.alert('Error', 'Revisa tu correo para confirmar la cuenta.');
    else setIsSignUp(false);
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <VersatileHeader />
        
        <View style={styles.form}>
          <Title style={styles.title}>
            {isSignUp ? 'Crear Cuenta' : 'Bienvenido/a'}
          </Title>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Regístrate para empezar' : 'Ingresa tus credenciales'}
          </Text>

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            outlineColor={COLORS.lightGray}
            activeOutlineColor={COLORS.primary}
          />

          <TextInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
            outlineColor={COLORS.lightGray}
            activeOutlineColor={COLORS.primary}
          />

          <Button
            mode="contained"
            onPress={isSignUp ? signUpWithEmail : signInWithEmail}
            loading={loading}
            style={styles.button}
            buttonColor={COLORS.primary}
          >
            {isSignUp ? 'Registrarse' : 'Entrar'}
          </Button>

          <Button
            mode="text"
            onPress={() => setIsSignUp(!isSignUp)}
            textColor={COLORS.primary}
          >
            {isSignUp ? '¿Ya tienes cuenta? Entra' : '¿No tienes cuenta? Regístrate'}
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContent: {
    flexGrow: 1,
  },
  form: {
    padding: 30,
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    color: COLORS.black,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 30,
  },
  input: {
    marginBottom: 16,
    backgroundColor: COLORS.white,
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
});

export default AuthScreen;
