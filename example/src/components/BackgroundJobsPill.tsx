import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

interface BackgroundJobsPillProps {
  visible: boolean;
  jobCount: number;
  imageCount: number;
  earliestStartedAt: number | null;
  onPress?: () => void;
}

export const BackgroundJobsPill: React.FC<BackgroundJobsPillProps> = ({
  visible,
  jobCount,
  imageCount,
  earliestStartedAt,
  onPress,
}) => {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: visible ? 0 : -80,
        useNativeDriver: true,
        speed: 14,
        bounciness: 6,
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, translateY, opacity]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  useEffect(() => {
    if (!visible || earliestStartedAt == null) {
      setElapsedSec(0);
      return;
    }
    const tick = () => {
      setElapsedSec(Math.floor((Date.now() - earliestStartedAt) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [visible, earliestStartedAt]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible && (translateY as unknown as { _value: number })._value === -80)
    return null;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[styles.wrapper, { transform: [{ translateY }], opacity }]}
    >
      <Pressable onPress={onPress} style={styles.pill}>
        <Animated.View
          style={[styles.spinnerWrap, { transform: [{ rotate }] }]}
        >
          <Text style={styles.spinner}>↻</Text>
        </Animated.View>
        <View style={styles.textBlock}>
          <Text style={styles.title}>
            Compressing {imageCount} {imageCount === 1 ? 'image' : 'images'}
            {' · '}
            {elapsedSec}s
          </Text>
          <Text style={styles.subtitle}>
            {jobCount > 1
              ? `${jobCount} jobs running in background`
              : 'Running in background — keep using the app'}
          </Text>
        </View>
        <Text style={styles.chevron}>→</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 50,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    ...shadow.md,
  },
  spinnerWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  spinner: {
    fontSize: 22,
    color: colors.warning,
    fontWeight: '700',
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  chevron: {
    fontSize: 18,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
});
