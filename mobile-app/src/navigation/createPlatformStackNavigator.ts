// ============================================================
// RETINOVA — Platform-Aware Stack Navigator Factory
// Uses JS-based @react-navigation/stack on web (fixes screens
// rendering simultaneously), and native-stack on iOS/Android.
// ============================================================
import { Platform } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

/**
 * Returns the correct stack navigator for the current platform.
 * - Web: JS-based stack (renders only the active screen)
 * - Native: native-stack (better perf on iOS/Android)
 */
export function createPlatformStackNavigator<T extends Record<string, object | undefined>>() {
  if (Platform.OS === 'web') {
    return createStackNavigator<T>();
  }
  return createNativeStackNavigator<T>();
}
