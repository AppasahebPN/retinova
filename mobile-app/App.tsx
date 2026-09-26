import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Platform, ImageBackground, StyleSheet, View } from "react-native";
import { AuthContext, useAuthProvider } from "./src/hooks/useAuth";
import { BackgroundProvider, useBackground } from "./src/context/BackgroundContext";
import { LoadingOverlay } from "./src/components";
import RootNavigator from "./src/navigation/RootNavigator";
import { COLORS } from "./src/utils/constants";

enableScreens(true);

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "transparent",
    card: COLORS.surface,
    text: COLORS.textPrimary,
    border: COLORS.borderLight,
    primary: COLORS.accent,
  },
};

function MainAppShell() {
  const { currentOption } = useBackground();

  return (
    <ImageBackground
      source={currentOption.source}
      style={styles.bgRoot}
      imageStyle={styles.bgImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </View>
    </ImageBackground>
  );
}

export default function App() {
  const auth = useAuthProvider();

  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const fontId = "retinova-google-fonts";
      if (!document.getElementById(fontId)) {
        const link = document.createElement("link");
        link.id = fontId;
        link.rel = "stylesheet";
        link.href =
          "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Source+Sans+3:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap";
        document.head.appendChild(link);
      }

      const styleId = "retinova-web-bg-fixes";
      let style = document.getElementById(styleId) as HTMLStyleElement | null;
      if (!style) {
        style = document.createElement("style");
        style.id = styleId;
        document.head.appendChild(style);
      }
      style.textContent = `
        html, body {
          background-color: #F4EFE8;
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          overflow: hidden;
        }
        #root {
          background-color: transparent !important;
          height: 100%;
          max-height: 100vh;
          width: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        /* Fix screen stacking on web: completely hide any inactive screen/tab */
        div[hidden] {
          display: none !important;
        }
        div[style*="z-index: -1"], div[style*="z-index:-1"] {
          display: none !important;
        }
        /* Fix scrolling: ensure scrollable containers scroll smoothly on web */
        [data-rnw-scrollview], [style*="overflow-y: auto"], [style*="overflow-y: scroll"], [style*="overflowY: auto"], [style*="overflowY: scroll"] {
          -webkit-overflow-scrolling: touch;
          touch-action: pan-y;
          overscroll-behavior-y: contain;
        }
      `;
    }
  }, []);

  if (auth.isLoading) {
    return (
      <GestureHandlerRootView style={styles.provider}>
        <SafeAreaProvider>
          <LoadingOverlay message="Loading RETINOVA..." />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.provider}>
      <SafeAreaProvider style={styles.provider}>
        <AuthContext.Provider value={auth}>
          <BackgroundProvider>
            <MainAppShell />
          </BackgroundProvider>
        </AuthContext.Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  provider: {
    flex: 1,
    height: "100%",
    width: "100%",
    backgroundColor: "#F4EFE8",
  },
  bgRoot: {
    flex: 1,
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  bgImage: {
    opacity: 0.95,
  },
  overlay: {
    flex: 1,
    height: "100%",
    width: "100%",
    overflow: "hidden",
    backgroundColor: "rgba(244, 239, 232, 0.74)",
    ...(Platform.OS === "web"
      ? ({
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        } as any)
      : {}),
  },
});
