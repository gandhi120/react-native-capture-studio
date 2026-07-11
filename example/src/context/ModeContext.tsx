import React, { createContext, useCallback, useContext, useState } from 'react';

export type CompressionMode = 'with' | 'without';

interface ModeContextType {
  mode: CompressionMode;
  setMode: (m: CompressionMode) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const ModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mode, setModeState] = useState<CompressionMode>('with');
  const setMode = useCallback((m: CompressionMode) => setModeState(m), []);
  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
};

export const useMode = (): ModeContextType => {
  const ctx = useContext(ModeContext);
  if (!ctx) {
    throw new Error('useMode must be used within a ModeProvider');
  }
  return ctx;
};
