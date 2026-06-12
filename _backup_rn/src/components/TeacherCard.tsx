import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { User, ChevronRight } from 'lucide-react-native';

interface TeacherCardProps {
  name: string;
  classesCount: number;
  onPress: () => void;
}

const TeacherCard = ({ name, classesCount, onPress }: TeacherCardProps) => {
  const colors = useThemeColors();

  return (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: colors.white, shadowColor: colors.isDark ? 'transparent' : colors.black }]} 
      onPress={onPress}
    >
      <View style={styles.left}>
        <View style={[styles.avatar, { backgroundColor: colors.isDark ? '#2A2740' : '#F0EFFF' }]}>
          <User color={colors.primary} size={24} />
        </View>
        <View>
          <Text style={[styles.name, { color: colors.black }]}>{name}</Text>
          <Text style={[styles.subtitle, { color: colors.gray }]}>{classesCount} clases asignadas</Text>
        </View>
      </View>
      <ChevronRight color={colors.lightGray} size={20} />
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});

export default TeacherCard;
