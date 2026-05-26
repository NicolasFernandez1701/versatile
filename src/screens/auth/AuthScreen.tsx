import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput, Button, Text, Title } from 'react-native-paper';
import { supabase } from '../../api/supabaseClient';
import { useNavigation } from '@react-navigation/native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Eye, EyeOff, Fingerprint } from 'lucide-react-native';
import { useKeyboardOffset } from '../../hooks/useKeyboardOffset';
import { useThemeColors } from '../../hooks/useThemeColors';

const AuthScreen = () => {
  const navigation = useNavigation();
  const translateY = useKeyboardOffset();
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricsAvailable(hasHardware && isEnrolled);
  };

  const handleBiometricAuth = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Inicia sesión con biometría',
      fallbackLabel: 'Usar contraseña',
    });

    if (result.success) {
      Alert.alert('Biometría', 'Autenticación exitosa. (Debes haber iniciado sesión con contraseña al menos una vez)');
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos.');
      return;
    }

    setLoading(true);
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) Alert.alert('Error de Login', error.message);
    } else {
      if (!fullName) {
        Alert.alert('Error', 'Por favor ingresa tu nombre completo.');
        setLoading(false);
        return;
      }
      
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });
      
      if (error) {
        Alert.alert('Error de Registro', error.message);
      } else {
        Alert.alert(
          'Registro Exitoso', 
          'Por favor verifica tu email o intenta iniciar sesión si la confirmación está desactivada.'
        );
        setIsLogin(true);
      }
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View 
        style={[styles.animatedContainer, { transform: [{ translateY }] }]}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={false}
        >
          <View style={styles.logoContainer}>
             <Image 
               source={require('../../../assets/logo.png')} 
               style={styles.logoImage} 
               resizeMode="contain"
             />
             <Title style={[styles.brandTitle, { color: colors.primary }]}>Versatile</Title>
             <Text style={[styles.brandSubtitle, { color: colors.gray }]}>STUDIO</Text>
          </View>

          <View style={styles.formContainer}>
            <Title style={[styles.formTitle, { color: colors.black }]}>
              {isLogin ? 'Bienvenida de nuevo' : 'Crear cuenta'}
            </Title>
            <Text style={[styles.formSubtitle, { color: colors.gray }]}>
              {isLogin ? 'Ingresa tus datos para continuar' : 'Únete a nuestra comunidad'}
            </Text>

            {!isLogin && (
              <TextInput
                label="Nombre Completo"
                value={fullName}
                onChangeText={setFullName}
                mode="outlined"
                style={[styles.input, { backgroundColor: colors.white }]}
                outlineColor={colors.lightGray}
                activeOutlineColor={colors.primary}
                textColor={colors.black}
              />
            )}

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, { backgroundColor: colors.white }]}
              outlineColor={colors.lightGray}
              activeOutlineColor={colors.primary}
              textColor={colors.black}
            />

            <TextInput
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              style={[styles.input, { backgroundColor: colors.white }]}
              outlineColor={colors.lightGray}
              activeOutlineColor={colors.primary}
              textColor={colors.black}
              right={
                <TextInput.Icon 
                  icon={() => showPassword ? <EyeOff size={20} color={colors.gray} /> : <Eye size={20} color={colors.gray} />} 
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            <Button 
              mode="contained" 
              onPress={handleAuth} 
              loading={loading}
              style={styles.authButton}
              buttonColor={colors.primary}
              textColor="#FFFFFF"
              labelStyle={styles.authButtonLabel}
            >
              {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
            </Button>

            {isLogin && biometricsAvailable && (
              <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricAuth}>
                <Fingerprint color={colors.primary} size={32} />
                <Text style={[styles.biometricText, { color: colors.primary }]}>Ingresar con huella</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              onPress={() => setIsLogin(!isLogin)}
              style={styles.switchButton}
            >
              <Text style={[styles.switchText, { color: colors.gray }]}>
                {isLogin ? '¿No tienes cuenta? ' : '¿Ya tienes cuenta? '}
                <Text style={[styles.switchTextBold, { color: colors.primary }]}>
                  {isLogin ? 'Regístrate' : 'Inicia Sesión'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 30,
    paddingBottom: 50,
    flexGrow: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  brandSubtitle: {
    fontSize: 14,
    letterSpacing: 4,
    marginTop: -5,
  },
  formContainer: {
    width: '100%',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  formSubtitle: {
    fontSize: 14,
    marginBottom: 30,
  },
  input: {
    marginBottom: 15,
  },
  authButton: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  authButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 25,
    gap: 10,
  },
  biometricText: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 30,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
  },
  switchTextBold: {
    fontWeight: 'bold',
  },
});

export default AuthScreen;
