// ============================================================
// RETINOVA — Background Theme Context
// Provides user-selected scenic or clinical background across all screens
// ============================================================
import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../services/storage';

export type BackgroundId = 'provided' | 'clinical' | 'healthcare';

export interface BackgroundOption {
  id: BackgroundId;
  title: string;
  subtitle: string;
  source: any;
}

export const BACKGROUND_OPTIONS: Record<BackgroundId, BackgroundOption> = {
  provided: {
    id: 'provided',
    title: 'Misty Mountain Sunrise',
    subtitle: 'Golden sunrise landscape (User Provided)',
    source: require('../../assets/background.jpg'),
  },
  clinical: {
    id: 'clinical',
    title: 'Clinical Eye Care',
    subtitle: 'Modern ophthalmology examination (Online)',
    source: require('../../assets/clinic-bg.jpg'),
  },
  healthcare: {
    id: 'healthcare',
    title: 'Healthcare Specialist',
    subtitle: 'Clinical telemedicine consultation (Online)',
    source: require('../../assets/healthcare-bg.jpg'),
  },
};

const BG_STORAGE_KEY = 'retinova_app_background_choice';

interface BackgroundContextType {
  backgroundId: BackgroundId;
  setBackgroundId: (id: BackgroundId) => Promise<void>;
  currentOption: BackgroundOption;
  options: BackgroundOption[];
}

const BackgroundContext = createContext<BackgroundContextType>({
  backgroundId: 'provided',
  setBackgroundId: async () => {},
  currentOption: BACKGROUND_OPTIONS.provided,
  options: Object.values(BACKGROUND_OPTIONS),
});

export function BackgroundProvider({ children }: { children: React.ReactNode }) {
  const [backgroundId, setBackgroundIdState] = useState<BackgroundId>('provided');

  useEffect(() => {
    storage.getItem(BG_STORAGE_KEY).then((saved) => {
      if (saved && (saved in BACKGROUND_OPTIONS)) {
        setBackgroundIdState(saved as BackgroundId);
      }
    });
  }, []);

  const setBackgroundId = async (id: BackgroundId) => {
    setBackgroundIdState(id);
    await storage.setItem(BG_STORAGE_KEY, id);
  };

  const currentOption = BACKGROUND_OPTIONS[backgroundId] || BACKGROUND_OPTIONS.provided;
  const options = Object.values(BACKGROUND_OPTIONS);

  return (
    <BackgroundContext.Provider
      value={{
        backgroundId,
        setBackgroundId,
        currentOption,
        options,
      }}
    >
      {children}
    </BackgroundContext.Provider>
  );
}

export function useBackground() {
  return useContext(BackgroundContext);
}
