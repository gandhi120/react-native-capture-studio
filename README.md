# react-native-capture-studio

Cross-platform native image compression and watermarking for React Native.

## Features

- **Background Processing** - Images processed off the main thread
- **WebP Compression** - Better quality at smaller file sizes than JPEG
- **Auto Watermark** - Adds timestamp text at bottom-right corner
- **Target Size** - Compresses to 300-500KB with highest possible quality
- **In-place Replace** - Overwrites original file (path stays the same)
- **Cross Platform** - Works on both iOS and Android

## Installation

```bash
yarn add git+https://github.com/gandhi120/react-native-capture-studio.git
```

### iOS Setup

```bash
cd ios && pod install && cd ..
```

**Requires iOS 15.1+**

### Android Setup

No additional setup required.

**Requires Android 11+ (API 30)**

## Usage

### Basic Usage

```typescript
import { processImages, fetchProcessingResult } from 'react-native-capture-studio';

const compressImage = async (imagePath: string) => {
  const operationId = await processImages([
    {
      localPath: imagePath,
      timeStamp: new Date().toLocaleString(),
      isForOnlyWatermark: false,
      compressJpegImage: false,
      replaceOriginal: true,
    }
  ]);

  const poll = async () => {
    const result = JSON.parse(await fetchProcessingResult(operationId));

    if (result.status === 'completed') {
      console.log('Done!', result.processedImages);
    } else {
      setTimeout(poll, 500);
    }
  };

  poll();
};
```

### Multiple Images

```typescript
const compressMultipleImages = async (imagePaths: string[]) => {
  const images = imagePaths.map(path => ({
    localPath: path,
    timeStamp: new Date().toLocaleString(),
    isForOnlyWatermark: false,
    compressJpegImage: false,
    replaceOriginal: true,
  }));

  const operationId = await processImages(images);

  // Poll for result...
};
```

## License

MIT
