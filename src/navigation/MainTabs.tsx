import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { COLORS, FONTS, SPACING } from "../utils/constants";
import type { MainTabParamList } from "../types";
import HomeStack from "./HomeStack";
import HistoryStack from "./HistoryStack";
import SettingsScreen from "../screens/SettingsScreen";

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabIcon({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={tabStyles.iconWrap}>
      <View style={[tabStyles.dot, active && tabStyles.dotActive]} />
      <Text style={[tabStyles.iconLabel, active && tabStyles.iconLabelActive]}>{label}</Text>
    </View>
  );
}
const tabStyles = StyleSheet.create({
  iconWrap: { alignItems: "center", paddingTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "transparent", marginBottom: 3 },
  dotActive: { backgroundColor: COLORS.accent },
  iconLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: FONTS.weightMedium },
  iconLabelActive: { color: COLORS.accent, fontWeight: FONTS.weightBold },
});

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: 4,
          height: 58,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="HOME" active={focused} />,
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={HistoryStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="HISTORY" active={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerTitle: "Settings",
          headerStyle: { backgroundColor: COLORS.surface },
          headerTitleStyle: { color: COLORS.textPrimary, fontWeight: FONTS.weightSemiBold },
          tabBarIcon: ({ focused }) => <TabIcon label="SETTINGS" active={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
