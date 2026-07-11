import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import { useMode } from '../context/ModeContext';
import { colors, radius, shadow, spacing, typography } from '../theme';

export const ModeToggle: React.FC = () => {
  const { mode, setMode } = useMode();

  return (
    <Card>
      <Text style={[typography.h3, styles.title]}>Compression Mode</Text>
      <View style={styles.segment}>
        <Segment
          active={mode === 'without'}
          tone="danger"
          icon="❌"
          label="Without Background"
          onPress={() => setMode('without')}
        />
        <Segment
          active={mode === 'with'}
          tone="success"
          icon="✅"
          label="With Capture Studio"
          onPress={() => setMode('with')}
        />
      </View>

      {mode === 'without' ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            <Text style={styles.bannerBold}>Simulation:</Text> heavy work runs
            on the JS thread on purpose, so you can see exactly what compression
            in pure JS would feel like — tap counter freezes, list scroll
            judders, animations on the UI thread keep moving.
          </Text>
        </View>
      ) : (
        <View style={styles.bannerOk}>
          <Text style={styles.bannerOkText}>
            Compression runs on a native background worker. JS thread stays free
            for taps, scroll, and animations.
          </Text>
        </View>
      )}
    </Card>
  );
};

interface SegmentProps {
  active: boolean;
  tone: 'success' | 'danger';
  icon: string;
  label: string;
  onPress: () => void;
}

const Segment: React.FC<SegmentProps> = ({
  active,
  tone,
  icon,
  label,
  onPress,
}) => {
  const activeBg = tone === 'success' ? colors.success : colors.danger;
  return (
    <Pressable
      style={[
        styles.segBtn,
        active && { backgroundColor: activeBg, borderColor: activeBg },
        active && shadow.sm,
      ]}
      onPress={onPress}
    >
      <Text style={[styles.segIcon, active && styles.segIconActive]}>
        {icon}
      </Text>
      <Text style={[styles.segLabel, active && styles.segLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  title: {
    marginBottom: spacing.md,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  segIcon: {
    fontSize: 14,
  },
  segIconActive: {},
  segLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  segLabelActive: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  banner: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  bannerText: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 18,
  },
  bannerBold: {
    fontWeight: '700',
  },
  bannerOk: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successLight,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  bannerOkText: {
    color: colors.success,
    fontSize: 12,
    lineHeight: 18,
  },
});
