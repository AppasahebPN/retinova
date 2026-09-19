import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { COLORS, FONTS } from "../utils/constants";
import type { HomeStackParamList } from "../types";

import HomeScreen from "../screens/HomeScreen";
import PatientSearchScreen from "../screens/PatientSearchScreen";
import NewPatientScreen from "../screens/NewPatientScreen";
import EyeSelectionScreen from "../screens/EyeSelectionScreen";
import ImageCaptureScreen from "../screens/ImageCaptureScreen";
import ImagePreviewScreen from "../screens/ImagePreviewScreen";
import ProcessingScreen from "../screens/ProcessingScreen";
import ScreeningResultScreen from "../screens/ScreeningResultScreen";
import EvidenceScreen from "../screens/EvidenceScreen";
import ReferralScreen from "../screens/ReferralScreen";

const Stack = createNativeStackNavigator<HomeStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.accent,
  headerTitleStyle: { fontWeight: FONTS.weightSemiBold, fontSize: FONTS.sizeMD, color: COLORS.textPrimary },
  headerShadowVisible: true,
};

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PatientSearch" component={PatientSearchScreen} options={{ title: "Find Patient" }} />
      <Stack.Screen name="NewPatient" component={NewPatientScreen} options={{ title: "Register Patient" }} />
      <Stack.Screen name="EyeSelection" component={EyeSelectionScreen} options={{ title: "Select Eye" }} />
      <Stack.Screen name="ImageCapture" component={ImageCaptureScreen} options={{ title: "Capture Fundus Image" }} />
      <Stack.Screen name="ImagePreview" component={ImagePreviewScreen} options={{ title: "Image Preview" }} />
      <Stack.Screen name="Processing" component={ProcessingScreen} options={{ title: "AI Screening", headerBackVisible: false, gestureEnabled: false }} />
      <Stack.Screen name="ScreeningResult" component={ScreeningResultScreen} options={{ title: "Screening Result", headerBackVisible: false }} />
      <Stack.Screen name="Evidence" component={EvidenceScreen} options={{ title: "Screening Details" }} />
      <Stack.Screen name="Referral" component={ReferralScreen} options={{ title: "Referral" }} />
    </Stack.Navigator>
  );
}
