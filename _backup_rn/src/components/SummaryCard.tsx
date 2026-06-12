import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { LucideIcon } from 'lucide-react-native';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
}

const SummaryCard = ({ title, value, subtitle, icon: Icon, iconColor }: SummaryCardProps) => {
  const colors = useThemeColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.white, shadowColor: colors.isDark ? 'transparent' : '#000' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.gray }]}>{title}</Text>
        <Icon size={20} color={iconColor || colors.primary} />
      </View>
      <Text style={[styles.value, { color: colors.black }]}>{value}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    width: '48%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 10,
    color: '#4CAF50',
    marginTop: 4,
  },
});

export default SummaryCard;
