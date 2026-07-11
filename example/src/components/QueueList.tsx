import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Card } from './Card';
import {
  useCameraContext,
  type ImageItem,
  type ImageStatus,
} from '../context/CameraContext';
import { colors, radius, spacing, typography } from '../theme';
import { formatBytes } from '../utils/format';

export const QueueList: React.FC = () => {
  const { queue } = useCameraContext();

  if (queue.length === 0) {
    return null;
  }

  const completed = queue.filter((q) => q.status === 'completed').length;
  const total = queue.length;
  const totalBefore = queue.reduce((s, q) => s + (q.beforeSize ?? 0), 0);
  const totalAfter = queue.reduce(
    (s, q) => s + (q.status === 'completed' ? (q.afterSize ?? 0) : 0),
    0
  );

  return (
    <Card>
      <View style={styles.header}>
        <Text style={styles.headerMeta}>
          {completed} / {total} done
        </Text>
      </View>

      {completed > 0 && (
        <Text style={[typography.caption, styles.subhead]}>
          {formatBytes(totalBefore)} → {formatBytes(totalAfter)}
          {totalBefore > 0
            ? ` · saved ${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(0)}%`
            : ''}
        </Text>
      )}

      <View style={styles.list}>
        {queue.map((item, idx) => (
          <QueueRow key={`${item.path}-${idx}`} item={item} />
        ))}
      </View>
    </Card>
  );
};

interface QueueRowProps {
  item: ImageItem;
}

const QueueRow: React.FC<QueueRowProps> = ({ item }) => {
  const fileName = item.path.split('/').pop() ?? 'image';

  const savings =
    item.status === 'completed' && item.beforeSize && item.afterSize != null
      ? `${(((item.beforeSize - item.afterSize) / item.beforeSize) * 100).toFixed(0)}%`
      : null;

  return (
    <View style={styles.row}>
      <View style={styles.thumbWrap}>
        <Image
          source={{ uri: `file://${item.path.replace('file://', '')}` }}
          style={styles.thumb}
        />
        <View style={styles.statusOverlay}>
          <Text style={[styles.statusIcon, statusIconStyle(item.status)]}>
            {iconFor(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.fileName} numberOfLines={1}>
          {fileName}
        </Text>

        <Text style={styles.meta}>
          {formatBytes(item.beforeSize ?? 0)}
          {item.status === 'completed' && item.afterSize != null ? (
            <>
              {' → '}
              <Text style={styles.metaAfter}>
                {formatBytes(item.afterSize)}
              </Text>
              {savings ? (
                <Text style={styles.metaSaved}> · {savings}</Text>
              ) : null}
            </>
          ) : null}
        </Text>

        {item.status === 'waiting' && (
          <View style={styles.badgeWaiting}>
            <Text style={styles.badgeWaitingText}>Waiting</Text>
          </View>
        )}
        {item.status === 'compressing' && (
          <View style={styles.badgeCompressing}>
            <Text style={styles.badgeCompressingText}>Compressing…</Text>
          </View>
        )}
        {item.status === 'error' && (
          <Text style={styles.errorText}>
            {item.errorMessage ?? 'Compression failed'}
          </Text>
        )}
      </View>
    </View>
  );
};

function iconFor(status: ImageStatus): string {
  switch (status) {
    case 'waiting':
      return '⌛';
    case 'compressing':
      return '⚙';
    case 'completed':
      return '✓';
    case 'error':
      return '!';
    default:
      return '·';
  }
}

function statusIconStyle(status: ImageStatus) {
  switch (status) {
    case 'completed':
      return { color: colors.success };
    case 'error':
      return { color: colors.danger };
    case 'compressing':
      return { color: colors.primary };
    case 'waiting':
    default:
      return { color: colors.textMuted };
  }
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  headerMeta: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  subhead: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  list: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
  },
  thumbWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.border,
    marginRight: spacing.md,
    position: 'relative',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  statusOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    width: 22,
    height: 22,
    borderTopLeftRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    fontSize: 13,
    fontWeight: '700',
  },
  body: {
    flex: 1,
  },
  fileName: {
    ...typography.bodyBold,
    fontSize: 13,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  metaAfter: {
    color: colors.success,
    fontWeight: '600',
  },
  metaSaved: {
    color: colors.success,
    fontWeight: '700',
  },
  badgeWaiting: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgeWaitingText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeCompressing: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  badgeCompressingText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: 4,
  },
});
