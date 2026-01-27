import React, { createContext, useContext, useState, useCallback } from 'react';

export interface CapturedImage {
  path: string;
  timestamp: string;
  processed: boolean;
}

interface CameraContextType {
  capturedImages: CapturedImage[];
  addImage: (path: string) => void;
  clearImages: () => void;
  markProcessed: (path: string) => void;
  processingStatus: 'idle' | 'processing' | 'completed' | 'error';
  setProcessingStatus: (
    status: 'idle' | 'processing' | 'completed' | 'error'
  ) => void;
  operationId: string | null;
  setOperationId: (id: string | null) => void;
}

const CameraContext = createContext<CameraContextType | undefined>(undefined);

export const CameraProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [processingStatus, setProcessingStatus] = useState<
    'idle' | 'processing' | 'completed' | 'error'
  >('idle');
  const [operationId, setOperationId] = useState<string | null>(null);

  const addImage = useCallback((path: string) => {
    const newImage: CapturedImage = {
      path,
      timestamp: new Date().toLocaleString(),
      processed: false,
    };
    setCapturedImages((prev) => [...prev, newImage]);
  }, []);

  const clearImages = useCallback(() => {
    setCapturedImages([]);
    setProcessingStatus('idle');
    setOperationId(null);
  }, []);

  const markProcessed = useCallback((path: string) => {
    setCapturedImages((prev) =>
      prev.map((img) => (img.path === path ? { ...img, processed: true } : img))
    );
  }, []);

  return (
    <CameraContext.Provider
      value={{
        capturedImages,
        addImage,
        clearImages,
        markProcessed,
        processingStatus,
        setProcessingStatus,
        operationId,
        setOperationId,
      }}
    >
      {children}
    </CameraContext.Provider>
  );
};

export const useCameraContext = (): CameraContextType => {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error('useCameraContext must be used within a CameraProvider');
  }
  return context;
};
