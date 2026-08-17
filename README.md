# react-native-capture-studio

Cross-platform native image compression and watermarking for React Native.

[![npm](https://img.shields.io/npm/v/react-native-capture-studio.svg)](https://www.npmjs.com/package/react-native-capture-studio)
[![platforms](https://img.shields.io/badge/platforms-ios%20%7C%20android-lightgrey.svg)](#installation)
[![license](https://img.shields.io/npm/l/react-native-capture-studio.svg)](./LICENSE)

Shrink multi-megabyte camera photos to a predictable 300–500 KB, stamped with a
timestamp watermark, entirely in native code and off the JS thread.

<p align="center">
  <img
    src="https://raw.githubusercontent.com/gandhi120/react-native-capture-studio/main/docs/demo.gif"
    alt="Capturing four photos, compressing them from 14 MB to 1.89 MB with timestamp watermarks, then generating thumbnails"
    width="320"
  />
</p>

> Real numbers from the demo above: **14.04 MB → 1.89 MB across four photos (86.6% saved)**,
> thumbnails in ~85 ms.

## Features

- **Background Processing** - Images processed off the main thread
- **WebP Compression** - Better quality at smaller file sizes than JPEG
- **Auto Watermark** - Adds timestamp text at bottom-right corner
- **Target Size** - Compresses to 300-500KB with highest possible quality
- **In-place Replace** - Overwrites original file (path stays the same)
- **Fast Thumbnails** - Downsamples during decode, never loads the full image
- **Cross Platform** - Works on both iOS and Android

## Installation

```bash
yarn add react-native-capture-studio
```

**Requires React Native 0.82+** (New Architecture only) and React 19+.

### iOS Setup

```bash
cd ios && pod install && cd ..
```

**Requires iOS 15.1+**

### Android Setup

No additional setup required — no permissions are added to your app.

**Requires Android 10+ (API 29)**

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

> **Note:** `isForOnlyWatermark`, `compressJpegImage`, and `replaceOriginal` are typed as
> optional but must currently be passed on Android — omitting them rejects with
> `PROCESS_ERROR`. `replaceOriginal` is not yet honoured on either platform; the original
> file is always overwritten.

### Thumbnails

```typescript
import { generateThumbnail } from 'react-native-capture-studio';

// Writes <original>_thumb.jpg next to the source image and resolves its path
const thumbPath = await generateThumbnail({
  localPath: imagePath,
  maxSize: 200, // max pixel dimension, default 100
});
```

Downsamples during decode, so the full image is never loaded into memory.

## Not implemented

`openCaptureStudio()` is exported but has no capture UI on either platform — it resolves
`{ status: "not_implemented" }`. Use a camera library such as
[react-native-vision-camera](https://github.com/mrousavy/react-native-vision-camera) to
capture, then pass the resulting paths to `processImages()`.

## License

MIT
