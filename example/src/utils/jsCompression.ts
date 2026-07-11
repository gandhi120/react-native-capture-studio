import { Buffer } from 'buffer';
import * as jpeg from 'jpeg-js';
import ReactNativeBlobUtil from 'react-native-blob-util';

const JPEG_QUALITY = 30;
const MAX_DIMENSION = 1024;

export const compressOnJsThread = async (
  filePath: string
): Promise<{ outputPath: string; afterSize: number }> => {
  const path = filePath.replace('file://', '');

  const base64In = await ReactNativeBlobUtil.fs.readFile(path, 'base64');
  const inputBuffer = Buffer.from(base64In, 'base64');

  const decoded = jpeg.decode(inputBuffer, { useTArray: true });

  const { data, width, height } = downscale(
    decoded.data,
    decoded.width,
    decoded.height,
    MAX_DIMENSION
  );

  const encoded = jpeg.encode({ data, width, height }, JPEG_QUALITY);

  const base64Out = Buffer.from(encoded.data as unknown as Uint8Array).toString(
    'base64'
  );
  await ReactNativeBlobUtil.fs.writeFile(path, base64Out, 'base64');

  const stat = await ReactNativeBlobUtil.fs.stat(path);
  return { outputPath: filePath, afterSize: stat.size };
};

const downscale = (
  src: Uint8Array,
  srcW: number,
  srcH: number,
  maxDim: number
): { data: Uint8Array; width: number; height: number } => {
  const longest = Math.max(srcW, srcH);
  if (longest <= maxDim) return { data: src, width: srcW, height: srcH };

  const scale = maxDim / longest;
  const dstW = Math.round(srcW * scale);
  const dstH = Math.round(srcH * scale);
  const dst = new Uint8Array(dstW * dstH * 4);

  for (let y = 0; y < dstH; y++) {
    const srcY = Math.min(srcH - 1, Math.floor(y / scale));
    for (let x = 0; x < dstW; x++) {
      const srcX = Math.min(srcW - 1, Math.floor(x / scale));
      const srcIdx = (srcY * srcW + srcX) * 4;
      const dstIdx = (y * dstW + x) * 4;
      dst[dstIdx] = src[srcIdx]!;
      dst[dstIdx + 1] = src[srcIdx + 1]!;
      dst[dstIdx + 2] = src[srcIdx + 2]!;
      dst[dstIdx + 3] = src[srcIdx + 3]!;
    }
  }
  return { data: dst, width: dstW, height: dstH };
};
