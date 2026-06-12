import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { User, CreditCard, ChevronRight, MessageCircle, Mail } from 'lucide-react-native';

interface StudentCardProps {
  name: string;
  plan: string;
  status: 'Al Día' | 'Pendiente' | 'Vencido';
  phone?: string;
  email?: string;
  onPress: () => void;
}

const StudentCard = ({ name, plan, status, phone, email, onPress }: StudentCardProps) => {
  const colors = useThemeColors();

  const getBadgeColors = () => {
    switch (status) {
      case 'Al Día':
        return {
          bg: colors.isDark ? '#1C3E2D' : '#E8F5E9',
          text: colors.isDark ? '#66BB6A' : '#2E7D32',
        };
      case 'Pendiente':
        return {
          bg: colors.isDark ? '#3E2E1C' : '#FFF3E0',
          text: colors.isDark ? '#FFA726' : '#EF6C00',
        };
      case 'Vencido':
        return {
          bg: colors.isDark ? '#3E1C1F' : '#FFEBEE',
          text: colors.isDark ? '#E57373' : colors.error,
        };
    }
  };

  const handleWhatsApp = (phoneNum: string) => {
    const cleaned = phoneNum.replace(/[^\d+]/g, '');
    Linking.openURL(`https://wa.me/${cleaned}`);
  };

  const handleEmail = (emailStr: string) => {
    Linking.openURL(`mailto:${emailStr}`);
  };

  const badgeColors = getBadgeColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.white, shadowColor: colors.isDark ? 'transparent' : colors.black }]}>
      <TouchableOpacity style={styles.topRow} onPress={onPress}>
        <View style={styles.left}>
          <View style={[styles.avatar, { backgroundColor: colors.background }]}>
            <User color={colors.gray} size={24} />
          </View>
          <View style={styles.infoCol}>
            <Text style={[styles.name, { color: colors.black }]} numberOfLines={1}>{name}</Text>
            <View style={styles.planRow}>
              <CreditCard size={13} color={colors.gray} />
              <Text style={[styles.planText, { color: colors.gray }]} numberOfLines={1}>{plan}</Text>
            </View>
          </View>
        </View>
        <View style={styles.right}>
          <View style={[styles.badge, { backgroundColor: badgeColors!.bg }]}>
            <Text style={[styles.badgeText, { color: badgeColors!.text }]}>{status}</Text>
          </View>
          <ChevronRight color={colors.lightGray} size={20} />
        </View>
      </TouchableOpacity>

      {(phone || email) && (
        <View style={[styles.actionRow, { borderTopColor: colors.lightGray }]}>
          {phone ? (
            <TouchableOpacity
              onPress={() => handleWhatsApp(phone)}
              style={[styles.contactButton, { backgroundColor: colors.isDark ? '#1E3E26' : '#E8F5E9' }]}
            >
              <MessageCircle size={14} color={colors.isDark ? '#66BB6A' : '#2E7D32'} />
              <Text style={[styles.contactButtonText, { color: colors.isDark ? '#66BB6A' : '#2E7D32' }]}>WhatsApp</Text>
            </TouchableOpacity>
          ) : null}
          {email ? (
            <TouchableOpacity
              onPress={() => handleEmail(email)}
              style={[styles.contactButton, { backgroundColor: colors.isDark ? '#2A2740' : '#F0EFFF' }]}
            >
              <Mail size={14} color={colors.primary} />
              <Text style={[styles.contactButtonText, { color: colors.primary }]}>Enviar Email</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: 'transparent',
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoCol: {
    flex: 1,
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
  actionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    padding: 10,
    gap: 10,
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  contactButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default StudentCard;
