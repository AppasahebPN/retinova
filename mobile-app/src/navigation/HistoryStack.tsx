import React from "react";
import { createPlatformStackNavigator } from "./createPlatformStackNavigator";
import { COLORS, FONTS } from "../utils/constants";
import type { HistoryStackParamList } from "../types";

import HistoryScreen from "../screens/HistoryScreen";
import ScreeningDetailScreen from "../screens/ScreeningDetailScreen";
import EvidenceScreen from "../screens/EvidenceScreen";
import ReferralScreen from "../screens/ReferralScreen";

const Stack = createPlatformStackNavigator<HistoryStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.accent,
  headerTitleStyle: { fontWeight: FONTS.weightSemiBold, fontSize: FONTS.sizeMD, color: COLORS.textPrimary },
  headerShadowVisible: true,
};

export default function HistoryStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen name="History" component={HistoryScreen} options={{ title: "Screening History" }} />
      <Stack.Screen name="ScreeningDetail" component={ScreeningDetailScreen} options={{ title: "Screening Detail" }} />
      <Stack.Screen name="Evidence" component={EvidenceScreen} options={{ title: "Screening Details" }} />
      <Stack.Screen name="Referral" component={ReferralScreen} options={{ title: "Referral" }} />
    </Stack.Navigator>
  );
}
