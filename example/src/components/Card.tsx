import React from 'react';
import { View, StyleSheet, type ViewStyle, type ViewProps } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
  variant?: 'default' | 'muted' | 'accent';
  style?: ViewStyle | ViewStyle[];
}

export const Card: React.FC<CardProps> = ({
  children,
  padded = true,
  variant = 'default',
  style,
  ...rest
}) => {
  return (
    <View
      style={[
        styles.base,
        padded && styles.padded,
        variant === 'muted' && styles.muted,
        variant === 'accent' && styles.accent,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadow.sm,
  },
  padded: {
    padding: spacing.lg,
  },
  muted: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
  },
  accent: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
});
