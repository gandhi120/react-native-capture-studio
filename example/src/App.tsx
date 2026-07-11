import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraProvider, useCameraContext } from './context/CameraContext';
import { ModeProvider } from './context/ModeContext';
import { CameraScreen } from './screens/CameraScreen';
import { StyledButton } from './components/StyledButton';
import { HeaderBadges } from './components/HeaderBadges';
import { ModeToggle } from './components/ModeToggle';
import { QueueList } from './components/QueueList';
import { ResponsivenessTest } from './components/ResponsivenessTest';
import { BackgroundJobsPill } from './components/BackgroundJobsPill';
import { useCompressionEngine } from './hooks/useCompressionEngine';
import { colors, radius, spacing, typography } from './theme';

const MainContent: React.FC = () => {
  const { queue, clearQueue } = useCameraContext();
  const [started, setStarted] = useState(false);

  useCompressionEngine(started);

  const [showCamera, setShowCamera] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const queueSectionY = useRef(0);

  const compressingItem = useMemo(
    () => queue.find((q) => q.status === 'compressing'),
    [queue]
  );
  const waitingCount = useMemo(
    () => queue.filter((q) => q.status === 'waiting').length,
    [queue]
  );
  const pillVisible = compressingItem != null;
  const remaining = (compressingItem ? 1 : 0) + waitingCount;
  const hasWaiting = waitingCount > 0;
  const isProcessing = compressingItem != null;

  const handleClear = useCallback(() => {
    clearQueue();
    setStarted(false);
  }, [clearQueue]);

  const handleStart = useCallback(() => {
    setStarted(true);
  }, []);

  const scrollToQueue = useCallback(() => {
    scrollRef.current?.scrollTo({ y: queueSectionY.current, animated: true });
  }, []);

  const startSubtitle = isProcessing
    ? 'Processing… new captures auto-queue'
    : hasWaiting
      ? `${waitingCount} waiting · tap to begin`
      : started
        ? 'Engine running · capture more to auto-queue'
        : 'Capture some images first';

  return (
    <View style={styles.container}>
      <BackgroundJobsPill
        visible={pillVisible}
        jobCount={1}
        imageCount={remaining}
        earliestStartedAt={compressingItem?.startedAt ?? null}
        onPress={scrollToQueue}
      />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>React Native Capture Studio</Text>
          <Text style={styles.subtitle}>Background Image Compression Demo</Text>
          <View style={styles.platformChip}>
            <View style={styles.chipDot} />
            <Text style={styles.platformText}>{Platform.OS}</Text>
          </View>
          <View style={styles.accent} />
        </View>

        <View style={styles.section}>
          <HeaderBadges />
        </View>

        <View style={styles.section}>
          <ModeToggle />
        </View>

        <View style={styles.section}>
          <StyledButton
            icon="📷"
            title="Capture Images"
            subtitle={
              queue.length > 0
                ? `${queue.length} in queue · burst mode recommended`
                : 'Open camera in burst mode and snap ~20'
            }
            variant="primary"
            onPress={() => setShowCamera(true)}
          />
          <View style={styles.spaced}>
            <StyledButton
              icon="▶"
              title={
                isProcessing
                  ? 'Compression Running…'
                  : started && !hasWaiting
                    ? 'Engine Ready'
                    : 'Start Compression'
              }
              subtitle={startSubtitle}
              variant="primary"
              disabled={!hasWaiting || isProcessing || started}
              onPress={handleStart}
            />
          </View>
          {queue.length > 0 && (
            <View style={styles.spaced}>
              <StyledButton
                icon="✕"
                title="Clear Queue"
                variant="ghost"
                onPress={handleClear}
              />
            </View>
          )}
        </View>

        <View
          style={styles.section}
          onLayout={(e) => {
            queueSectionY.current = e.nativeEvent.layout.y;
          }}
        >
          <QueueList />
        </View>

        <View style={styles.section}>
          <ResponsivenessTest />
        </View>
      </ScrollView>

      <Modal
        visible={showCamera}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <CameraScreen onClose={() => setShowCamera(false)} />
      </Modal>
    </View>
  );
};

export default function App() {
  return (
    <ModeProvider>
      <CameraProvider>
        <MainContent />
      </CameraProvider>
    </ModeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl * 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  platformChip: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: spacing.sm,
  },
  platformText: {
    ...typography.caption,
    color: colors.textPrimary,
    textTransform: 'lowercase',
  },
  accent: {
    marginTop: spacing.lg,
    height: 3,
    width: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  section: {
    marginTop: spacing.lg,
  },
  spaced: {
    marginTop: spacing.sm,
  },
});
