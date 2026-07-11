import { useEffect, useRef } from 'react';
import {
  processImages,
  fetchProcessingResult,
  type ImageProcessingItem,
} from 'react-native-capture-studio';
import { useCameraContext } from '../context/CameraContext';
import { useMode } from '../context/ModeContext';
import { compressOnJsThread } from '../utils/jsCompression';
import { getFileSize } from '../utils/format';

const POLL_INTERVAL_MS = 250;

/**
 * Picks the next 'waiting' item and processes it; either via native
 * processImages (mode === 'with') or by running a real JPEG decode +
 * re-encode in pure JavaScript (mode === 'without') to demo what
 * happens when compression runs on the JS thread.
 *
 * Pass `enabled=false` to keep the queue idle (waiting items sit in
 * 'waiting' until the user explicitly starts compression).
 */
export const useCompressionEngine = (enabled: boolean) => {
  const { queue, patchItem } = useCameraContext();
  const { mode } = useMode();

  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const modeRef = useRef(mode);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (busyRef.current) return;
    const next = queue.find((q) => q.status === 'waiting');
    if (!next) return;

    busyRef.current = true;

    (async () => {
      patchItem(next.path, {
        status: 'compressing',
        startedAt: Date.now(),
      });

      try {
        if (modeRef.current === 'with') {
          await runNativeCompression(next.path, next.timestamp);
          if (!mountedRef.current) return;
          const after = await getFileSize(next.path);
          patchItem(next.path, {
            status: 'completed',
            finishedAt: Date.now(),
            afterSize: after,
          });
        } else {
          const { afterSize } = await compressOnJsThread(next.path);
          if (!mountedRef.current) return;
          patchItem(next.path, {
            status: 'completed',
            finishedAt: Date.now(),
            afterSize,
          });
        }
      } catch (err) {
        if (!mountedRef.current) return;
        const message = err instanceof Error ? err.message : String(err);
        patchItem(next.path, {
          status: 'error',
          finishedAt: Date.now(),
          errorMessage: message,
        });
      } finally {
        busyRef.current = false;
      }
    })();
  }, [queue, patchItem, enabled]);
};

async function runNativeCompression(path: string, timestamp: string) {
  const item: ImageProcessingItem = {
    localPath: path,
    timeStamp: timestamp,
    isForOnlyWatermark: false,
    compressJpegImage: false,
    replaceOriginal: true,
  };
  const opId = await processImages([item]);
  return new Promise<void>((resolve, reject) => {
    const poll = async () => {
      try {
        const json = await fetchProcessingResult(opId);
        const result = JSON.parse(json) as {
          status: 'processing' | 'completed';
          processedImages?: Array<{ success: boolean; error?: string | null }>;
        };
        if (result.status === 'completed') {
          const failed = (result.processedImages ?? []).find((p) => !p.success);
          if (failed) {
            reject(new Error(failed.error ?? 'Unknown compression error'));
          } else {
            resolve();
          }
        } else {
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('NOT_FOUND')) {
          reject(new Error('Operation not found'));
        } else {
          setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    };
    setTimeout(poll, 100);
  });
}
