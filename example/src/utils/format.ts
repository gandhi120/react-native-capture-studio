import ReactNativeBlobUtil from 'react-native-blob-util';

export const getFileSize = async (filePath: string): Promise<number> => {
  try {
    const path = filePath.replace('file://', '');
    const stat = await ReactNativeBlobUtil.fs.stat(path);
    return stat.size;
  } catch {
    return 0;
  }
};

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
