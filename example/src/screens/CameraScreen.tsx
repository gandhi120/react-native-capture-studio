import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  type PhotoFile,
} from 'react-native-vision-camera';
import { useCameraContext } from '../context/CameraContext';

interface CameraScreenProps {
  onClose: () => void;
}

export const CameraScreen: React.FC<CameraScreenProps> = ({ onClose }) => {
  const camera = useRef<Camera>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flash, setFlash] = useState<'off' | 'on'>('off');

  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const { addImage, capturedImages } = useCameraContext();

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  const takePhoto = useCallback(async () => {
    if (!camera.current || isCapturing) return;

    try {
      setIsCapturing(true);

      const photo: PhotoFile = await camera.current.takePhoto({
        flash: flash,
        enableShutterSound: true,
      });

      // The path is in the cache directory
      const imagePath =
        Platform.OS === 'ios' ? photo.path : `file://${photo.path}`;

      console.log('Photo captured:', imagePath);
      addImage(imagePath);

      Alert.alert(
        'Photo Captured',
        `Saved to: ${imagePath}\n\nTotal photos: ${capturedImages.length + 1}`,
        [
          { text: 'Take More', style: 'default' },
          { text: 'Done', onPress: onClose },
        ]
      );
    } catch (error: any) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', `Failed to capture photo: ${error.message}`);
    } finally {
      setIsCapturing(false);
    }
  }, [flash, isCapturing, addImage, capturedImages.length, onClose]);

  const toggleFlash = useCallback(() => {
    setFlash((prev) => (prev === 'off' ? 'on' : 'off'));
  }, []);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>Camera permission required</Text>
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
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>No camera device found</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
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
      />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.topButton} onPress={onClose}>
          <Text style={styles.topButtonText}>Close</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.topButton} onPress={toggleFlash}>
          <Text style={styles.topButtonText}>
            Flash: {flash === 'on' ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>

        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>{capturedImages.length}</Text>
        </View>
      </View>

      {/* Bottom Bar */}
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

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={styles.instructionText}>
          Tap the button to capture photos
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  topButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
  },
  topButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  counterBadge: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 50,
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
    borderColor: 'rgba(255,255,255,0.5)',
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
    bottom: 150,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    color: 'white',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  permissionText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
  },
});
