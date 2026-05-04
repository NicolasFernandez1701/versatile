import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../theme/colors';
import { User, CreditCard, ChevronRight } from 'lucide-react-native';

interface StudentCardProps {
  name: string;
  plan: string;
  status: 'Al Día' | 'Pendiente' | 'Vencido';
  onPress: () => void;
}

const StudentCard = ({ name, plan, status, onPress }: StudentCardProps) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.left}>
      <View style={styles.avatar}>
        <User color={COLORS.gray} size={24} />
      </View>
      <View>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.planRow}>
          <CreditCard size={14} color={COLORS.gray} />
          <Text style={styles.planText}>{plan}</Text>
        </View>
      </View>
    </View>
    <View style={styles.right}>
      <View style={[
        styles.badge, 
        { backgroundColor: status === 'Al Día' ? '#E8F5E9' : status === 'Pendiente' ? '#FFF3E0' : '#FFEBEE' }
      ]}>
        <Text style={[
          styles.badgeText,
          { color: status === 'Al Día' ? '#2E7D32' : status === 'Pendiente' ? '#EF6C00' : COLORS.error }
        ]}>{status}</Text>
      </View>
      <ChevronRight color={COLORS.lightGray} size={20} />
    </View>
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
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  planText: {
    fontSize: 12,
    color: COLORS.gray,
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
