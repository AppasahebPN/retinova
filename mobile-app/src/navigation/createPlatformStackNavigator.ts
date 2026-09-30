// ============================================================
// RETINOVA — Platform-Aware Stack Navigator Factory
// Uses JS-based @react-navigation/stack on web (fixes screens
// rendering simultaneously), and native-stack on iOS/Android.
//
// IMPORTANT: Do NOT statically import @react-navigation/stack here.
// That package depends on react-native-gesture-handler, which
// crashes native Android if its initialization import is missing.
// We use a lazy require() on web only to avoid bundling it on native.
// ============================================================
import { Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

/**
 * Returns the correct stack navigator for the current platform.
 * - Web: JS-based stack (renders only the active screen)
 * - Native: native-stack (better perf on iOS/Android)
 */
export function createPlatformStackNavigator<T extends Record<string, object | undefined>>() {
  if (Platform.OS === 'web') {
    // Lazy require to avoid bundling @react-navigation/stack (and its
    // react-native-gesture-handler dependency) into native Android builds.
    const { createStackNavigator } = require('@react-navigation/stack');
    return createStackNavigator<T>();
  }
  return createNativeStackNavigator<T>();
}
