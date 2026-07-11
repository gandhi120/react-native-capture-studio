import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Alert,
  Platform,
  Linking,
  Animated,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  type PhotoFile,
} from 'react-native-vision-camera';
import { useCameraContext } from '../context/CameraContext';
import { getFileSize } from '../utils/format';

type Mode = 'single' | 'burst';

interface CameraScreenProps {
  onClose: () => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({ onClose }) => {
  const camera = useRef<Camera>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState<'off' | 'on'>('off');
  const [cameraType, setCameraType] = useState<'back' | 'front'>('back');
  const [mode, setMode] = useState<Mode>('burst');
  const [shotCount, setShotCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslate = useRef(new Animated.Value(-20)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(cameraType);

  const { enqueueImage, queue } = useCameraContext();

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const showToast = useCallback(
    (msg: string) => {
      setToastMessage(msg);
      if (toastTimer.current) clearTimeout(toastTimer.current);
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslate, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      toastTimer.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(toastTranslate, {
            toValue: -20,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }, 700);
    },
    [toastOpacity, toastTranslate]
  );

  const takePhoto = useCallback(async () => {
    if (!camera.current || isCapturing) return;
    try {
      setIsCapturing(true);
      const photo: PhotoFile = await camera.current.takePhoto({
        flash: flash,
        enableShutterSound: true,
      });
      const imagePath =
        Platform.OS === 'ios' ? photo.path : `file://${photo.path}`;
      const beforeSize = await getFileSize(imagePath);
      const timestamp = new Date().toLocaleString();
      enqueueImage(imagePath, timestamp, beforeSize);

      const nextCount = shotCount + 1;
      setShotCount(nextCount);

      if (mode === 'burst') {
        showToast(`Captured #${nextCount}`);
      } else {
        Alert.alert('Photo Captured', `Added to queue (#${nextCount})`, [
          { text: 'Take More', style: 'default' },
          { text: 'Done', onPress: onClose },
        ]);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to capture photo: ${message}`);
    } finally {
      setIsCapturing(false);
    }
  }, [flash, isCapturing, enqueueImage, onClose, mode, shotCount, showToast]);

  const toggleFlash = useCallback(
    () => setFlash((p) => (p === 'off' ? 'on' : 'off')),
    []
  );
  const toggleCamera = useCallback(
    () => setCameraType((p) => (p === 'back' ? 'front' : 'back')),
    []
  );

  if (!hasPermission) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Camera permission required</Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => {
            if (Platform.OS === 'ios') {
              Linking.openSettings();
            } else {
              requestPermission();
            }
          }}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>No camera device found</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        photo={true}
        outputOrientation="device"
      />

      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topButton} onPress={onClose}>
          <Text style={styles.topButtonText}>✕</Text>
        </TouchableOpacity>

        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modeOpt, mode === 'single' && styles.modeOptActive]}
            onPress={() => setMode('single')}
          >
            <Text
              style={[
                styles.modeOptText,
                mode === 'single' && styles.modeOptTextActive,
              ]}
            >
              Single
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeOpt, mode === 'burst' && styles.modeOptActive]}
            onPress={() => setMode('burst')}
          >
            <Text
              style={[
                styles.modeOptText,
                mode === 'burst' && styles.modeOptTextActive,
              ]}
            >
              Burst
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.topButton} onPress={onClose}>
          <Text style={styles.topButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.subBar}>
        <TouchableOpacity style={styles.subBtn} onPress={toggleFlash}>
          <Text style={styles.subBtnText}>
            ⚡ {flash === 'on' ? 'On' : 'Off'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.subBtn} onPress={toggleCamera}>
          <Text style={styles.subBtnText}>
            {cameraType === 'back' ? '⟳ Selfie' : '⟳ Rear'}
          </Text>
        </TouchableOpacity>
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{queue.length}</Text>
        </View>
      </View>

      {toastMessage && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslate }],
            },
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[
            styles.captureButton,
            isCapturing && styles.captureButtonDisabled,
          ]}
          onPress={takePhoto}
          disabled={isCapturing}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          {mode === 'burst' ? 'Burst mode — tap rapidly' : 'Tap to capture'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  fallback: {
    flex: 1,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fallbackText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  topButton: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    minWidth: 56,
    alignItems: 'center',
  },
  topButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    padding: 4,
  },
  modeOpt: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  modeOptActive: {
    backgroundColor: 'white',
  },
  modeOptText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  modeOptTextActive: {
    color: '#0F172A',
  },
  subBar: {
    position: 'absolute',
    top: 110,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  subBtn: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  subBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  counterBadge: {
    backgroundColor: '#2563EB',
    minWidth: 36,
    height: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  toast: {
    position: 'absolute',
    top: 170,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  toastText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },
  instructions: {
    position: 'absolute',
    bottom: 160,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 13,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  permissionButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  closeBtnText: {
    color: 'white',
    fontSize: 16,
  },
});
