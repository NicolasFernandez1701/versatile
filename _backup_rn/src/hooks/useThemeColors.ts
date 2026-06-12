import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/useThemeStore';

export const useThemeColors = () => {
  const { themeMode } = useThemeStore();
  const systemScheme = useColorScheme();
  
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');
  
  return {
    isDark,
    primary: isDark ? '#A794DF' : '#3E2682',      // Vibrant lavender in dark / Deep violet in light
    secondary: isDark ? '#2A2552' : '#A794DF',    // Deep violet highlight in dark / Lavender in light
    background: isDark ? '#0A0817' : '#F8F8F8',   // Premium midnight violet vs Soft off-white
    white: isDark ? '#15132A' : '#FFFFFF',        // Deep violet-slate cards vs Pure white
    black: isDark ? '#F1EEFD' : '#1A1A1A',        // Soft eye-friendly white text vs Charcoal
    gray: isDark ? '#9B96BF' : '#666666',         // Lavender grey secondary text vs Medium grey
    lightGray: isDark ? '#252147' : '#E0E0E0',    // Violet-tinted borders vs Light grey
    error: '#FF5252',
    success: '#4CAF50',
    warning: '#FFC107',
  };
};
