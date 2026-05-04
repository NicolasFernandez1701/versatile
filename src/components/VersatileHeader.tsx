import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';

const VersatileHeader = () => {
  return (
    <View style={styles.header}>
      <Text style={styles.versatile}>Versatile</Text>
      <Text style={styles.studio}>STUDIO</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    padding: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  versatile: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: -1,
  },
  studio: {
    fontSize: 14,
    fontWeight: '300',
    color: COLORS.secondary,
    marginLeft: 4,
    letterSpacing: 2,
  },
});

export default VersatileHeader;
