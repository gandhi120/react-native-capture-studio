import React, { useState, useCallback } from 'react';
import {
  Button,
  StyleSheet,
  View,
  Text,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Modal,
  Image,
  TouchableOpacity,
} from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import ImageViewer from 'react-native-image-zoom-viewer';
import {
  processImages,
  fetchProcessingResult,
  generateThumbnail,
  type ImageProcessingItem,
} from 'react-native-capture-studio';
import { CameraProvider, useCameraContext } from './context/CameraContext';
import { CameraScreen } from './screens/CameraScreen';

// Get file size using react-native-blob-util
const getFileSize = async (filePath: string): Promise<number> => {
  try {
    const path = filePath.replace('file://', '');
    const stat = await ReactNativeBlobUtil.fs.stat(path);
    return stat.size;
  } catch (error) {
    console.log('Error getting file size:', error);
    return 0;
  }
};

// Format bytes to human readable
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

interface ThumbnailInfo {
  path: string;
  fileName: string;
  size: number;
  timeMs: number;
}

interface ImageComparison {
  path: string;
  fileName: string;
  beforeSize: number;
  afterSize: number;
  savings: number;
  savingsPercent: number;
  success: boolean;
  error?: string;
}

const MainContent: React.FC = () => {
  const [showCamera, setShowCamera] = useState(false);
  const {
    capturedImages,
    clearImages,
    processingStatus,
    setProcessingStatus,
    operationId,
    setOperationId,
  } = useCameraContext();

  const [comparisons, setComparisons] = useState<ImageComparison[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<ThumbnailInfo[]>([]);
  const [thumbnailSize, setThumbnailSize] = useState(200);
  const [showSizeDropdown, setShowSizeDropdown] = useState(false);

  const sizeOptions = [100, 150, 200];

  // Get file sizes before processing
  const captureFileSizes = useCallback(async () => {
    const sizes = new Map<string, number>();
    for (const img of capturedImages) {
      const size = await getFileSize(img.path);
      sizes.set(img.path, size);
    }
    return sizes;
  }, [capturedImages]);

  // Process captured images
  const handleProcessImages = useCallback(async () => {
    if (capturedImages.length === 0) {
      Alert.alert('No Images', 'Please capture some images first');
      return;
    }

    try {
      setProcessingStatus('processing');
      setComparisons([]);

      // Capture before sizes
      const beforeSizesMap = await captureFileSizes();
      console.log('Before sizes:', Object.fromEntries(beforeSizesMap));

      // Convert to ImageProcessingItem array
      // Use WebP compression (compressJpegImage: false) for better quality at smaller size
      const imagesToProcess: ImageProcessingItem[] = capturedImages.map(
        (img) => ({
          localPath: img.path,
          timeStamp: img.timestamp,
          isForOnlyWatermark: false,
          compressJpegImage: false, // false = WebP (better quality), true = JPEG
          replaceOriginal: true, // Always replace original file at same path (like Android)
        })
      );

      console.log('Processing images:', imagesToProcess);

      // Start processing
      const opId = await processImages(imagesToProcess);
      setOperationId(opId);
      console.log('Operation ID:', opId);

      // Poll for result
      const pollForResult = async () => {
        try {
          const resultJson = await fetchProcessingResult(opId);
          const result = JSON.parse(resultJson);

          console.log('Poll result:', result);

          if (result.status === 'completed') {
            setProcessingStatus('completed');

            // Calculate after sizes and create comparison
            const comparisonData: ImageComparison[] = [];

            for (const processedImg of result.processedImages || []) {
              const imagePath = processedImg.localPath;
              const beforeSize = beforeSizesMap.get(imagePath) || 0;
              // Same path - file was replaced with WebP data
              const afterSize = await getFileSize(imagePath);
              const savings = beforeSize - afterSize;
              const savingsPercent =
                beforeSize > 0 ? (savings / beforeSize) * 100 : 0;

              comparisonData.push({
                path: imagePath,
                fileName: imagePath?.split('/').pop() || 'Unknown',
                beforeSize,
                afterSize,
                savings,
                savingsPercent,
                success: processedImg.success,
                error: processedImg.error,
              });
            }

            setComparisons(comparisonData);
          } else if (result.status === 'processing') {
            setTimeout(pollForResult, 500);
          }
        } catch (error: any) {
          if (error.message?.includes('NOT_FOUND')) {
            setProcessingStatus('error');
            Alert.alert('Error', 'Operation not found');
          } else {
            setTimeout(pollForResult, 500);
          }
        }
      };

      setTimeout(pollForResult, 200);
    } catch (error: any) {
      console.error('Process error:', error);
      setProcessingStatus('error');
      Alert.alert('Error', error.message);
    }
  }, [capturedImages, setProcessingStatus, setOperationId, captureFileSizes]);

  const handleClearAll = useCallback(() => {
    clearImages();
    setComparisons([]);
    setThumbnails([]);
  }, [clearImages]);

  const handleGenerateThumbnails = useCallback(async () => {
    if (capturedImages.length === 0) {
      Alert.alert('No Images', 'Capture some images first');
      return;
    }

    try {
      const thumbInfos: ThumbnailInfo[] = [];
      for (const img of capturedImages) {
        const start = Date.now();
        const thumbPath = await generateThumbnail({
          localPath: img.path,
          maxSize: thumbnailSize,
        });
        const timeMs = Date.now() - start;
        const size = await getFileSize(thumbPath);
        thumbInfos.push({
          path: thumbPath,
          fileName: thumbPath.split('/').pop() || 'Unknown',
          size,
          timeMs,
        });
      }
      setThumbnails(thumbInfos);
      Alert.alert('Done', `Generated ${thumbInfos.length} thumbnails`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }, [capturedImages, thumbnailSize]);

  // Calculate totals
  const totalBeforeSize = comparisons.reduce((sum, c) => sum + c.beforeSize, 0);
  const totalAfterSize = comparisons.reduce((sum, c) => sum + c.afterSize, 0);
  const totalSavings = totalBeforeSize - totalAfterSize;
  const totalSavingsPercent =
    totalBeforeSize > 0 ? (totalSavings / totalBeforeSize) * 100 : 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Capture Studio</Text>
        <Text style={styles.subtitle}>Image Compression Test</Text>
        <Text style={styles.platform}>Platform: {Platform.OS}</Text>

        {/* Camera Button */}
        <View style={styles.buttonContainer}>
          <Button
            title={`Open Camera (${capturedImages.length} photos)`}
            onPress={() => setShowCamera(true)}
            disabled={processingStatus === 'processing'}
          />
        </View>

        {/* Process Button */}
        <View style={styles.buttonContainer}>
          <Button
            title="Compress & Add Watermark"
            onPress={handleProcessImages}
            disabled={
              capturedImages.length === 0 || processingStatus === 'processing'
            }
          />
        </View>

        {/* Thumbnail Size Selector + Button */}
        <View style={styles.thumbnailControls}>
          <TouchableOpacity
            style={styles.sizeSelector}
            onPress={() => setShowSizeDropdown(!showSizeDropdown)}
          >
            <Text style={styles.sizeSelectorText}>
              {thumbnailSize}x{thumbnailSize}
            </Text>
            <Text style={styles.sizeSelectorArrow}>
              {showSizeDropdown ? '\u25B2' : '\u25BC'}
            </Text>
          </TouchableOpacity>
          <View style={styles.thumbnailButtonWrap}>
            <Button
              title="Generate Thumbnails"
              onPress={handleGenerateThumbnails}
              color="#5856D6"
              disabled={
                capturedImages.length === 0 || processingStatus === 'processing'
              }
            />
          </View>
        </View>
        {showSizeDropdown && (
          <View style={styles.dropdown}>
            {sizeOptions.map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.dropdownItem,
                  size === thumbnailSize && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  setThumbnailSize(size);
                  setShowSizeDropdown(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    size === thumbnailSize && styles.dropdownItemTextActive,
                  ]}
                >
                  {size}x{size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Clear Button */}
        <View style={styles.buttonContainer}>
          <Button
            title="Clear All"
            onPress={handleClearAll}
            color="#FF3B30"
            disabled={processingStatus === 'processing'}
          />
        </View>

        {/* Processing Status */}
        {processingStatus === 'processing' && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.statusText}>
              Processing {capturedImages.length} images...
            </Text>
            {operationId && (
              <Text style={styles.operationIdText}>
                ID: {operationId.substring(0, 8)}...
              </Text>
            )}
          </View>
        )}

        {/* Captured Images Preview (Before Processing) */}
        {capturedImages.length > 0 && comparisons.length === 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              Captured Images ({capturedImages.length})
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {capturedImages.map((img, index) => (
                <View key={index} style={styles.imagePreviewCard}>
                  <Image
                    source={{
                      uri: `file://${img.path.replace('file://', '')}`,
                    }}
                    style={styles.thumbnailLarge}
                  />
                  <Text style={styles.imageLabel}>#{index + 1}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Thumbnails Preview */}
        {thumbnails.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              Thumbnails ({thumbnails.length})
            </Text>
            {thumbnails.map((thumb, index) => (
              <View key={index} style={styles.thumbnailCard}>
                <Image
                  source={{
                    uri: `file://${thumb.path}?t=${Date.now()}`,
                  }}
                  style={styles.thumbnailImage}
                />
                <View style={styles.thumbnailInfo}>
                  <Text style={styles.thumbnailName} numberOfLines={1}>
                    {thumb.fileName}
                  </Text>
                  <Text style={styles.thumbnailSize}>
                    {formatBytes(thumb.size)} · {thumb.timeMs}ms
                  </Text>
                  <Text style={styles.thumbnailPath} selectable>
                    {thumb.path}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Comparison Table */}
        {comparisons.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Compression Results</Text>

            {/* Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Total Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Before:</Text>
                <Text style={styles.summaryValue}>
                  {formatBytes(totalBeforeSize)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>After:</Text>
                <Text style={styles.summaryValueGreen}>
                  {formatBytes(totalAfterSize)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Saved:</Text>
                <Text style={styles.summaryValueHighlight}>
                  {formatBytes(totalSavings)} ({totalSavingsPercent.toFixed(1)}
                  %)
                </Text>
              </View>
            </View>

            {/* Comparison Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.tableColFile]}>
                File
              </Text>
              <Text style={[styles.tableHeaderCell, styles.tableColSize]}>
                Before
              </Text>
              <Text style={[styles.tableHeaderCell, styles.tableColSize]}>
                After
              </Text>
              <Text style={[styles.tableHeaderCell, styles.tableColSaved]}>
                Saved
              </Text>
            </View>

            {/* Comparison Table Rows */}
            {comparisons.map((comp, index) => (
              <View
                key={index}
                style={[
                  styles.tableRow,
                  index % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd,
                ]}
              >
                <Text
                  style={[styles.tableCell, styles.tableColFile]}
                  numberOfLines={1}
                >
                  {comp.fileName}
                </Text>
                <Text style={[styles.tableCell, styles.tableColSize]}>
                  {formatBytes(comp.beforeSize)}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableColSize,
                    styles.textGreen,
                  ]}
                >
                  {formatBytes(comp.afterSize)}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableColSaved,
                    comp.success ? styles.textGreen : styles.textRed,
                  ]}
                >
                  {comp.success
                    ? `${comp.savingsPercent.toFixed(0)}%`
                    : 'Error'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* After Processing - Show Watermarked Images */}
        {comparisons.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>
              After Compression (WebP + Watermark)
            </Text>
            <Text style={styles.tapHint}>Tap image to view full screen</Text>
            {comparisons.map((comp, index) => (
              <TouchableOpacity
                key={index}
                style={styles.processedImageCard}
                onPress={() => setSelectedImage(comp.path)}
                activeOpacity={0.8}
              >
                <Image
                  source={{
                    uri: `file://${comp.path.replace('file://', '')}?t=${Date.now()}`,
                  }}
                  style={styles.processedImage}
                  resizeMode="contain"
                />
                <View style={styles.processedImageInfo}>
                  <Text style={styles.processedImageName}>{comp.fileName}</Text>
                  <Text style={styles.processedImageSize}>
                    {formatBytes(comp.beforeSize)} →{' '}
                    {formatBytes(comp.afterSize)}
                  </Text>
                  <Text
                    style={[
                      styles.processedImageStatus,
                      comp.success ? styles.textGreen : styles.textRed,
                    ]}
                  >
                    {comp.success
                      ? `Saved ${comp.savingsPercent.toFixed(1)}%`
                      : `Error: ${comp.error}`}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Path Info */}
        {comparisons.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>File Paths (Unchanged)</Text>
            <Text style={styles.pathNote}>
              Files compressed in-place with WebP format
            </Text>
            {comparisons.map((comp, index) => (
              <View key={index} style={styles.pathCard}>
                <Text style={styles.pathLabel}>Image #{index + 1}:</Text>
                <Text style={styles.pathText} selectable>
                  {comp.path}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>How to use:</Text>
          <Text style={styles.infoText}>
            1. Tap "Open Camera" to capture photos{'\n'}
            2. Take multiple photos{'\n'}
            3. Close camera when done{'\n'}
            4. Tap "Compress & Add Watermark"{'\n'}
            5. See before/after comparison table{'\n'}
            6. View watermarked images below
          </Text>
        </View>
      </ScrollView>

      {/* Full Screen Image Viewer Modal */}
      <Modal
        visible={selectedImage !== null}
        animationType="fade"
        transparent={false}
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.imageViewerContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedImage(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.zoomHint}>Pinch to zoom</Text>
          {selectedImage && (
            <ImageViewer
              imageUrls={[
                {
                  url: `file://${selectedImage.replace('file://', '')}`,
                },
              ]}
              enableSwipeDown
              onSwipeDown={() => setSelectedImage(null)}
              backgroundColor="#000"
              renderIndicator={() => <></>}
            />
          )}
        </View>
      </Modal>

      {/* Camera Modal */}
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
    <CameraProvider>
      <MainContent />
    </CameraProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  platform: {
    fontSize: 14,
    color: '#999',
    marginBottom: 30,
    textAlign: 'center',
  },
  buttonContainer: {
    marginVertical: 8,
    width: '100%',
  },
  processingContainer: {
    marginTop: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
  },
  statusText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
  },
  operationIdText: {
    marginTop: 5,
    fontSize: 12,
    color: '#999',
  },
  sectionContainer: {
    marginTop: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    color: '#333',
  },
  imagePreviewCard: {
    marginRight: 12,
    alignItems: 'center',
  },
  thumbnailLarge: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  imageLabel: {
    marginTop: 5,
    fontSize: 12,
    color: '#666',
  },
  // Summary Card
  summaryCard: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  summaryTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  summaryValue: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValueGreen: {
    color: '#90EE90',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValueHighlight: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Table styles
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderRadius: 6,
  },
  tableHeaderCell: {
    fontWeight: '700',
    fontSize: 12,
    color: '#333',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tableRowEven: {
    backgroundColor: '#FAFAFA',
  },
  tableRowOdd: {
    backgroundColor: 'white',
  },
  tableCell: {
    fontSize: 12,
    color: '#333',
  },
  tableColFile: {
    flex: 2,
  },
  tableColSize: {
    flex: 1.5,
    textAlign: 'center',
  },
  tableColSaved: {
    flex: 1,
    textAlign: 'right',
  },
  textGreen: {
    color: '#34C759',
    fontWeight: '600',
  },
  textRed: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  // Processed Images
  processedImageCard: {
    marginBottom: 15,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  processedImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#E5E5EA',
  },
  processedImageInfo: {
    padding: 12,
  },
  processedImageName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  processedImageSize: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  processedImageStatus: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  // Path info
  pathCard: {
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  pathLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  pathText: {
    fontSize: 10,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  pathNote: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  // Info
  infoContainer: {
    marginTop: 20,
    marginBottom: 40,
    padding: 15,
    backgroundColor: '#E8F4FF',
    borderRadius: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#007AFF',
  },
  infoText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 22,
  },
  // Image Viewer Modal
  imageViewerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  zoomHint: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    zIndex: 5,
  },
  tapHint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  // Thumbnail controls
  thumbnailControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    gap: 10,
  },
  sizeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#5856D6',
  },
  sizeSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5856D6',
  },
  sizeSelectorArrow: {
    fontSize: 10,
    color: '#5856D6',
    marginLeft: 6,
  },
  thumbnailButtonWrap: {
    flex: 1,
  },
  dropdown: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  dropdownItemActive: {
    backgroundColor: '#5856D6',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownItemTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  // Thumbnail styles
  thumbnailCard: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 10,
  },
  thumbnailImage: {
    width: 100,
    height: 100,
    backgroundColor: '#E5E5EA',
  },
  thumbnailInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  thumbnailName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  thumbnailSize: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5856D6',
    marginTop: 4,
  },
  thumbnailPath: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },
});
