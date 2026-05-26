import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { User, CreditCard, ChevronRight } from 'lucide-react-native';

interface StudentCardProps {
  name: string;
  plan: string;
  status: 'Al Día' | 'Pendiente' | 'Vencido';
  onPress: () => void;
}

const StudentCard = ({ name, plan, status, onPress }: StudentCardProps) => {
  const colors = useThemeColors();

  const getBadgeColors = () => {
    switch (status) {
      case 'Al Día':
        return {
          bg: colors.isDark ? '#1C3E2D' : '#E8F5E9',
          text: colors.isDark ? '#66BB6A' : '#2E7D32'
        };
      case 'Pendiente':
        return {
          bg: colors.isDark ? '#3E2E1C' : '#FFF3E0',
          text: colors.isDark ? '#FFA726' : '#EF6C00'
        };
      case 'Vencido':
        return {
          bg: colors.isDark ? '#3E1C1F' : '#FFEBEE',
          text: colors.isDark ? '#E57373' : colors.error
        };
    }
  };

  const badgeColors = getBadgeColors();

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.white, shadowColor: colors.isDark ? 'transparent' : colors.black }]} 
      onPress={onPress}
    >
      <View style={styles.left}>
        <View style={[styles.avatar, { backgroundColor: colors.background }]}>
          <User color={colors.gray} size={24} />
        </View>
        <View>
          <Text style={[styles.name, { color: colors.black }]}>{name}</Text>
          <View style={styles.planRow}>
            <CreditCard size={14} color={colors.gray} />
            <Text style={[styles.planText, { color: colors.gray }]}>{plan}</Text>
          </View>
        </View>
      </View>
      <View style={styles.right}>
        <View style={[styles.badge, { backgroundColor: badgeColors.bg }]}>
          <Text style={[styles.badgeText, { color: badgeColors.text }]}>{status}</Text>
        </View>
        <ChevronRight color={colors.lightGray} size={20} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  planText: {
    fontSize: 12,
    marginLeft: 4,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default StudentCard;
