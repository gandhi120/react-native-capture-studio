import CaptureStudio from './NativeCaptureStudio';

export type CaptureOptions = {
  multiple?: boolean;
  maxCount?: number;
  edit?: boolean;
  compress?: {
    quality?: number;
  };
};

export type ImageProcessingItem = {
  localPath: string;
  timeStamp: string;
  isForOnlyWatermark?: boolean;
  compressJpegImage?: boolean;
  replaceOriginal?: boolean; // true = override original, false = create new file (default: true)
};

export function openCaptureStudio(options: CaptureOptions = {}): Promise<any> {
  return CaptureStudio.openCaptureStudio(options);
}

export function processImages(images: ImageProcessingItem[]): Promise<string> {
  return CaptureStudio.processImages(images);
}

export function fetchProcessingResult(operationId: string): Promise<string> {
  return CaptureStudio.fetchProcessingResult(operationId);
}
