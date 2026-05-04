import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';
import { LucideIcon } from 'lucide-react-native';

interface SummaryCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
}

const SummaryCard = ({ title, value, subtitle, icon: Icon, iconColor }: SummaryCardProps) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <Text style={styles.title}>{title}</Text>
      <Icon size={20} color={iconColor || COLORS.primary} />
    </View>
    <Text style={styles.value}>{value}</Text>
    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
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
    color: COLORS.gray,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  subtitle: {
    fontSize: 10,
    color: COLORS.success,
    marginTop: 4,
  },
});

export default SummaryCard;
