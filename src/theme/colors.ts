import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const COLORS = {
  primary: '#3E2682', // Deep Violet from logo
  secondary: '#A794DF', // Light Lavender from logo icon
  background: '#F8F8F8', // Off-white
  white: '#FFFFFF',
  black: '#1A1A1A',
  gray: '#666666',
  lightGray: '#E0E0E0',
  error: '#FF5252',
  success: '#4CAF50',
  warning: '#FFC107',
};

export const updateColors = (isDark: boolean) => {
  if (isDark) {
    COLORS.primary = '#A794DF';
    COLORS.secondary = '#2A2552';
    COLORS.background = '#0A0817'; // Premium Midnight Violet
    COLORS.white = '#15132A';      // Deep Violet-Slate
    COLORS.black = '#F1EEFD';      // Soft White Text
    COLORS.gray = '#9B96BF';
    COLORS.lightGray = '#252147';
  } else {
    COLORS.primary = '#3E2682';
    COLORS.secondary = '#A794DF';
    COLORS.background = '#F8F8F8';
    COLORS.white = '#FFFFFF';
    COLORS.black = '#1A1A1A';
    COLORS.gray = '#666666';
    COLORS.lightGray = '#E0E0E0';
  }
};

export const getPaperTheme = (isDark: boolean) => {
  const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;
  return {
    ...baseTheme,
    roundness: 12,
    colors: {
      ...baseTheme.colors,
      primary: isDark ? '#A794DF' : '#3E2682',
      onPrimary: '#FFFFFF', // Ensures white text on primary buttons
      secondary: isDark ? '#2A2552' : '#A794DF',
      onSecondary: '#FFFFFF',
      background: isDark ? '#0A0817' : '#F8F8F8',
      onBackground: isDark ? '#F1EEFD' : '#1A1A1A',
      surface: isDark ? '#15132A' : '#FFFFFF',
      onSurface: isDark ? '#F1EEFD' : '#1A1A1A',
      error: '#FF5252',
      outline: isDark ? '#252147' : '#E0E0E0',
    },
  };
};

export const THEME = getPaperTheme(false);
