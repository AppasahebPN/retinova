import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthContext, useAuthProvider } from "./src/hooks/useAuth";
import { LoadingOverlay } from "./src/components";
import RootNavigator from "./src/navigation/RootNavigator";
import { COLORS } from "./src/utils/constants";

export default function App() {
  const auth = useAuthProvider();

  if (auth.isLoading) {
    return (
      <SafeAreaProvider>
        <LoadingOverlay message="Loading RETINOVA..." />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthContext.Provider value={auth}>
        <NavigationContainer>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </AuthContext.Provider>
    </SafeAreaProvider>
  );
}

