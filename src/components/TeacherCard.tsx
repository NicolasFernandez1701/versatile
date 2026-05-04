import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';
import { User, ChevronRight } from 'lucide-react-native';

interface TeacherCardProps {
  name: string;
  classesCount: number;
  onPress: () => void;
}

const TeacherCard = ({ name, classesCount, onPress }: TeacherCardProps) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.left}>
      <View style={styles.avatar}>
        <User color={COLORS.primary} size={24} />
      </View>
      <View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.subtitle}>{classesCount} clases asignadas</Text>
      </View>
    </View>
    <ChevronRight color={COLORS.lightGray} size={20} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: COLORS.black,
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
    backgroundColor: '#F0EFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
});

export default TeacherCard;
