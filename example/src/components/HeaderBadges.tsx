import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

const BADGES: { icon: string; label: string }[] = [
  { icon: '✓', label: 'Background Compression' },
  { icon: '⚡', label: 'Non-Blocking' },
  { icon: '✓', label: 'UI Thread Responsive' },
  { icon: '◧', label: 'Native Processing' },
];

export const HeaderBadges: React.FC = () => {
  return (
    <View style={styles.wrap}>
      {BADGES.map((b) => (
        <View key={b.label} style={styles.chip}>
          <Text style={styles.icon}>{b.icon}</Text>
          <Text style={styles.label}>{b.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  icon: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    marginRight: 6,
  },
  label: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
});
