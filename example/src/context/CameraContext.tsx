import React, { createContext, useCallback, useContext, useState } from 'react';

export type ImageStatus = 'waiting' | 'compressing' | 'completed' | 'error';

export interface ImageItem {
  path: string;
  timestamp: string;
  beforeSize: number | null;
  afterSize: number | null;
  status: ImageStatus;
  startedAt?: number;
  finishedAt?: number;
  errorMessage?: string;
}

interface CameraContextType {
  queue: ImageItem[];
  enqueueImage: (path: string, timestamp: string, beforeSize: number) => void;
  clearQueue: () => void;
  patchItem: (path: string, patch: Partial<ImageItem>) => void;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export const CameraProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [queue, setQueue] = useState<ImageItem[]>([]);

  const enqueueImage = useCallback(
    (path: string, timestamp: string, beforeSize: number) => {
      setQueue((prev) => [
        ...prev,
        {
          path,
          timestamp,
          beforeSize,
          afterSize: null,
          status: 'waiting',
        },
      ]);
    },
    []
  );

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const patchItem = useCallback((path: string, patch: Partial<ImageItem>) => {
    setQueue((prev) =>
      prev.map((item) => (item.path === path ? { ...item, ...patch } : item))
    );
  }, []);

  return (
    <CameraContext.Provider
      value={{ queue, enqueueImage, clearQueue, patchItem }}
    >
      {children}
    </CameraContext.Provider>
  );
};

export const useCameraContext = (): CameraContextType => {
  const ctx = useContext(CameraContext);
  if (!ctx) {
    throw new Error('useCameraContext must be used within a CameraProvider');
  }
  return ctx;
};
