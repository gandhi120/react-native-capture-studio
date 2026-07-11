import React, { useRef } from 'react';
import {
  Animated,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { colors, radius, shadow, spacing, typography } from '../theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface StyledButtonProps {
  title: string;
  subtitle?: string;
  icon?: string;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  fullWidth?: boolean;
}

export const StyledButton: React.FC<StyledButtonProps> = ({
  title,
  subtitle,
  icon,
  variant = 'primary',
  loading = false,
  disabled = false,
  onPress,
  style,
  fullWidth = true,
}) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const palette = getPalette(variant);
  const isInactive = disabled || loading;

  return (
    <Animated.View
      style={[{ transform: [{ scale }] }, fullWidth && styles.fullWidth, style]}
    >
      <Pressable
        onPress={isInactive ? undefined : onPress}
        onPressIn={isInactive ? undefined : handlePressIn}
        onPressOut={isInactive ? undefined : handlePressOut}
        style={[
          styles.base,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
            borderWidth: palette.borderWidth,
          },
          variant === 'primary' && shadow.sm,
          isInactive && styles.disabled,
        ]}
      >
        <View style={styles.row}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={palette.text}
              style={styles.iconSlot}
            />
          ) : icon ? (
            <Text style={[styles.icon, { color: palette.text }]}>{icon}</Text>
          ) : null}
          <View style={styles.textWrap}>
            <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, { color: palette.subtitle }]}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};

function getPalette(variant: Variant) {
  switch (variant) {
    case 'primary':
      return {
        bg: colors.primary,
        text: colors.textInverse,
        subtitle: 'rgba(255,255,255,0.85)',
        border: colors.primary,
        borderWidth: 0,
      };
    case 'secondary':
      return {
        bg: colors.surface,
        text: colors.primary,
        subtitle: colors.textMuted,
        border: colors.border,
        borderWidth: 1,
      };
    case 'danger':
      return {
        bg: colors.dangerLight,
        text: colors.danger,
        subtitle: colors.danger,
        border: colors.dangerLight,
        borderWidth: 0,
      };
    case 'ghost':
      return {
        bg: 'transparent',
        text: colors.textPrimary,
        subtitle: colors.textMuted,
        border: colors.border,
        borderWidth: 1,
      };
  }
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  base: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSlot: {
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 20,
    marginRight: spacing.md,
    width: 24,
    textAlign: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
