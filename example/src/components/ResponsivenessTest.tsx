import React, { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { useCameraContext } from '../context/CameraContext';
import { colors, radius, spacing, typography } from '../theme';

const BOXES = [
  { key: 'red', color: '#EF4444', label: 'Red' },
  { key: 'blue', color: '#2563EB', label: 'Blue' },
  { key: 'green', color: '#10B981', label: 'Green' },
  { key: 'yellow', color: '#F59E0B', label: 'Yellow' },
];

export const ResponsivenessTest: React.FC = () => {
  const { queue } = useCameraContext();
  const [counts, setCounts] = useState<Record<string, number>>({});

  const isCompressing = queue.some((q) => q.status === 'compressing');

  return (
    <Card>
      <Text style={[typography.h3, styles.title]}>Responsiveness Test</Text>

      {isCompressing ? (
        <View style={[styles.banner, styles.bannerActive]}>
          <Text style={styles.bannerActiveText}>
            👆 Tap the boxes now — see if they respond
          </Text>
        </View>
      ) : (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Start compression, then tap the boxes to feel the JS thread
          </Text>
        </View>
      )}

      <View style={styles.grid}>
        {BOXES.map((box) => (
          <TapBox
            key={box.key}
            color={box.color}
            label={box.label}
            count={counts[box.key] ?? 0}
            onTap={() =>
              setCounts((prev) => ({
                ...prev,
                [box.key]: (prev[box.key] ?? 0) + 1,
              }))
            }
          />
        ))}
      </View>

      <Pressable onPress={() => setCounts({})} style={styles.resetRow}>
        <Text style={styles.resetText}>Reset counts</Text>
      </Pressable>
    </Card>
  );
};

interface TapBoxProps {
  color: string;
  label: string;
  count: number;
  onTap: () => void;
}

const TapBox: React.FC<TapBoxProps> = ({ color, label, count, onTap }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    onTap();
    scale.stopAnimation();
    flash.stopAnimation();
    scale.setValue(0.9);
    flash.setValue(1);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: false,
        friction: 4,
        tension: 120,
      }),
      Animated.timing(flash, {
        toValue: 0,
        duration: 350,
        useNativeDriver: false,
      }),
    ]).start();
  };

  return (
    <Pressable onPress={handlePress} style={styles.boxWrap}>
      <Animated.View
        style={[
          styles.box,
          {
            backgroundColor: color,
            transform: [{ scale }],
          },
        ]}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            styles.flash,
            {
              opacity: flash,
            },
          ]}
        />
        <Text style={styles.boxCount}>{count}</Text>
        <Text style={styles.boxLabel}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.md,
  },
  banner: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  bannerActive: {
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  bannerText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
  bannerActiveText: {
    fontSize: 13,
    color: colors.textPrimary,
    textAlign: 'center',
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  boxWrap: {
    flex: 1,
    aspectRatio: 1,
  },
  box: {
    flex: 1,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  boxCount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textInverse,
    fontVariant: ['tabular-nums'],
  },
  boxLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textInverse,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
    opacity: 0.9,
  },
  resetRow: {
    alignSelf: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  resetText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
