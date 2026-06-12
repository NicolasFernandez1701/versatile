import React from 'react';
import { View, StyleSheet, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Title, Text, Card, List, Button } from 'react-native-paper';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore, ThemeMode } from '../store/useThemeStore';
import { useThemeColors } from '../hooks/useThemeColors';
import { LogOut, Sun, Moon, Monitor, Shield } from 'lucide-react-native';

const ProfileScreen = () => {
  const { profile, session, signOut } = useAuthStore();
  const { themeMode, setThemeMode } = useThemeStore();
  const systemScheme = useColorScheme();
  const colors = useThemeColors();

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro de que deseas salir de Versatile Studio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Salir', 
          style: 'destructive',
          onPress: async () => {
            await signOut();
          } 
        }
      ]
    );
  };

  const getInitials = (name: string) => {
    if (!name) return 'VS';
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getThemeText = (mode: ThemeMode) => {
    switch (mode) {
      case 'light': return 'Claro';
      case 'dark': return 'Oscuro';
      case 'system': return `Sistema (${systemScheme === 'dark' ? 'Oscuro' : 'Claro'})`;
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.white }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* User Card Header */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.secondary }]}>
            <Text style={styles.avatarText}>{getInitials(profile?.full_name || '')}</Text>
          </View>
          <Title style={[styles.userName, { color: colors.black }]}>{profile?.full_name || 'Usuario Versatile'}</Title>
          <View style={[styles.roleBadge, { backgroundColor: colors.isDark ? '#2A2740' : '#F0EFFF' }]}>
            <Shield size={14} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.roleText, { color: colors.primary }]}>
              {profile?.role === 'admin' ? 'Administrador' : profile?.role === 'teacher' ? 'Profesor' : 'Alumno'}
            </Text>
          </View>
        </View>

        {/* Distributed Info Section */}
        <View style={styles.infoSection}>
          {/* Profile Details */}
          <View style={styles.group}>
            <Text style={[styles.sectionTitle, { color: colors.black }]}>Información de la Cuenta</Text>
            <Card style={[styles.card, { backgroundColor: colors.white, borderColor: colors.lightGray }]}>
              <List.Item
                title="Correo Electrónico"
                description={session?.user?.email || 'No disponible'}
                left={props => <List.Icon {...props} icon="email-outline" color={colors.primary} />}
                titleStyle={[styles.listTitle, { color: colors.black }]}
                descriptionStyle={[styles.listDesc, { color: colors.gray }]}
              />
            </Card>
          </View>

          {/* Theme Settings */}
          <View style={styles.group}>
            <Text style={[styles.sectionTitle, { color: colors.black }]}>Apariencia y Tema</Text>
            <Card style={[styles.card, { backgroundColor: colors.white, borderColor: colors.lightGray }]}>
              <Card.Content style={{ paddingVertical: 12 }}>
                <Text style={[styles.themeSubtitle, { color: colors.gray }]}>Selecciona el tema de la interfaz:</Text>
                <View style={styles.themeOptionsContainer}>
                  {/* Light Option */}
                  <Button
                    mode={themeMode === 'light' ? 'contained' : 'outlined'}
                    onPress={() => setThemeMode('light')}
                    style={[styles.themeBtn, { borderColor: colors.lightGray }]}
                    buttonColor={themeMode === 'light' ? colors.primary : 'transparent'}
                    textColor={themeMode === 'light' ? '#FFFFFF' : colors.black}
                    icon={() => <Sun size={18} color={themeMode === 'light' ? '#FFFFFF' : colors.black} />}
                  >
                    Claro
                  </Button>

                  {/* Dark Option */}
                  <Button
                    mode={themeMode === 'dark' ? 'contained' : 'outlined'}
                    onPress={() => setThemeMode('dark')}
                    style={[styles.themeBtn, { borderColor: colors.lightGray }]}
                    buttonColor={themeMode === 'dark' ? colors.primary : 'transparent'}
                    textColor={themeMode === 'dark' ? '#FFFFFF' : colors.black}
                    icon={() => <Moon size={18} color={themeMode === 'dark' ? '#FFFFFF' : colors.black} />}
                  >
                    Oscuro
                  </Button>

                  {/* System Option */}
                  <Button
                    mode={themeMode === 'system' ? 'contained' : 'outlined'}
                    onPress={() => setThemeMode('system')}
                    style={[styles.themeBtn, { borderColor: colors.lightGray }]}
                    buttonColor={themeMode === 'system' ? colors.primary : 'transparent'}
                    textColor={themeMode === 'system' ? '#FFFFFF' : colors.black}
                    icon={() => <Monitor size={18} color={themeMode === 'system' ? '#FFFFFF' : colors.black} />}
                  >
                    Sistema
                  </Button>
                </View>
                <Text style={[styles.currentThemeText, { color: colors.gray }]}>
                  Tema activo actual: <Text style={{ fontWeight: 'bold', color: colors.black }}>{getThemeText(themeMode)}</Text>
                </Text>
              </Card.Content>
            </Card>
          </View>
        </View>

        {/* Actions at the bottom */}
        <Button
          mode="contained"
          onPress={handleSignOut}
          style={styles.signOutButton}
          buttonColor={colors.error}
          textColor="#FFFFFF"
          icon={() => <LogOut size={20} color="#FFFFFF" />}
        >
          Cerrar Sesión
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 25,
    flex: 1,
    justifyContent: 'space-between',
  },
  avatarSection: {
    alignItems: 'center',
    marginVertical: 10,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoSection: {
    flex: 1,
    justifyContent: 'center',
    marginVertical: 20,
    gap: 20,
  },
  group: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    elevation: 0,
    overflow: 'hidden',
  },
  listTitle: {
    fontWeight: 'bold',
  },
  listDesc: {
    fontSize: 14,
  },
  themeSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  themeOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  themeBtn: {
    flex: 1,
    borderRadius: 8,
  },
  currentThemeText: {
    fontSize: 11,
    marginTop: 12,
    textAlign: 'center',
  },
  signOutButton: {
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 10,
  },
});

export default ProfileScreen;
