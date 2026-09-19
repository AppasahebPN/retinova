import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
  getAllKeys?: () => Promise<string[]>;
}

const isWeb = Platform.OS === 'web';

export const storage: StorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    }
    // Native path: strictly use native AsyncStorage
    return AsyncStorage.getItem(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return;
    }
    // Native path: strictly use native AsyncStorage
    await AsyncStorage.setItem(key, value);
  },

  removeItem: async (key: string): Promise<void> => {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return;
    }
    // Native path: strictly use native AsyncStorage
    await AsyncStorage.removeItem(key);
  },

  clear: async (): Promise<void> => {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
      return;
    }
    // Native path: strictly use native AsyncStorage
    await AsyncStorage.clear();
  },

  getAllKeys: async (): Promise<string[]> => {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        return Object.keys(window.localStorage);
      }
      return [];
    }
    // Native path: strictly use native AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    return keys ? [...keys] : [];
  },
};

export default storage;
