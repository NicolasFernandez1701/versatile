import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '../hooks/useThemeColors';

interface ThemeContainerProps {
  children: React.ReactNode;
  scrollable?: boolean;
  contentContainerStyle?: any;
}

export const ThemeContainer = ({ children, scrollable = true, contentContainerStyle }: ThemeContainerProps) => {
  const colors = useThemeColors();
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.white }]}>
      {scrollable ? (
        <ScrollView 
          contentContainerStyle={[styles.scrollContainer, { backgroundColor: colors.background }, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.viewContainer, { backgroundColor: colors.background }, contentContainerStyle]}>
          {children}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 50,
  },
  viewContainer: {
    flex: 1,
    padding: 20,
  },
});
