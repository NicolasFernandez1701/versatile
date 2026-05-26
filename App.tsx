import React, { useMemo } from 'react';
import { useColorScheme, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import { getPaperTheme, updateColors } from './src/theme/colors';
import { useThemeStore } from './src/store/useThemeStore';

export default function App() {
  const { themeMode } = useThemeStore();
  const systemScheme = useColorScheme();

  // Determina si el modo oscuro está activo
  const isDark = useMemo(() => {
    return themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');
  }, [themeMode, systemScheme]);

  // Mutamos en caliente el objeto estático COLORS para componentes tradicionales
  useMemo(() => {
    updateColors(isDark);
  }, [isDark]);

  // Generamos el tema correspondiente de React Native Paper
  const paperTheme = useMemo(() => {
    return getPaperTheme(isDark);
  }, [isDark]);

  // Generamos el tema correspondiente para React Navigation (heredando fuentes y firmas de DefaultTheme)
  const navigationTheme = useMemo(() => {
    return {
      ...DefaultTheme,
      dark: isDark,
      colors: {
        ...DefaultTheme.colors,
        primary: isDark ? '#A794DF' : '#3E2682',
        background: isDark ? '#121212' : '#F8F8F8', // Controla el fondo por defecto de todas las pantallas
        card: isDark ? '#1E1E1E' : '#FFFFFF',       // Controla el fondo del tab bar y los headers
        text: isDark ? '#FFFFFF' : '#1A1A1A',       // Controla el color del texto nativo
        border: isDark ? '#333333' : '#E0E0E0',     // Controla el color de los bordes nativos
      },
    };
  }, [isDark]);

  return (
    // La prop key obliga a recrear el árbol de React al cambiar de tema,
    // forzando la reevaluación de los StyleSheet.create que importan COLORS estáticamente.
    <View style={{ flex: 1 }} key={isDark ? 'dark' : 'light'}>
      <PaperProvider theme={paperTheme as any}>
        <NavigationContainer theme={navigationTheme}>
          <AppNavigator />
        </NavigationContainer>
      </PaperProvider>
    </View>
  );
}
