// ============================================================
// RETINOVA — District Manager Navigator (Role 2: district_manager)
// Public Health Command Center
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS, FONTS } from '../utils/constants';
import type {
  DistrictTabParamList, DistrictStackParamList,
} from '../types';

import DistrictDashboardScreen from '../screens/district/DistrictDashboardScreen';
import DistrictScreeningsScreen from '../screens/district/DistrictScreeningsScreen';
import DistrictReferralsScreen from '../screens/district/DistrictReferralsScreen';
import DistrictResourcePlanningScreen from '../screens/district/DistrictResourcePlanningScreen';
import DistrictReportsScreen from '../screens/district/DistrictReportsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SharedScreeningDetailScreen from '../screens/shared/SharedScreeningDetailScreen';
import EvidenceScreen from '../screens/EvidenceScreen';

const Tab = createBottomTabNavigator<DistrictTabParamList>();
const Stack = createNativeStackNavigator<DistrictStackParamList>();

function TabIcon({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={tabStyles.iconWrap}>
      <View style={[tabStyles.bar, active && tabStyles.barActive]} />
      <Text style={[tabStyles.iconLabel, active && tabStyles.iconLabelActive]}>{label}</Text>
    </View>
  );
}
const tabStyles = StyleSheet.create({
  iconWrap: { alignItems: 'center', paddingTop: 6, minWidth: 56 },
  bar: { width: 22, height: 3, borderRadius: 2, backgroundColor: 'transparent', marginBottom: 5 },
  barActive: { backgroundColor: COLORS.accent },
  iconLabel: { fontSize: 9.5, color: COLORS.textMuted, fontWeight: FONTS.weightMedium, letterSpacing: 0.4 },
  iconLabelActive: { color: COLORS.accent, fontWeight: FONTS.weightBold },
});

function DistrictTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: 6,
          paddingTop: 4,
          height: 64,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="DashboardTab"
        component={DistrictDashboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Dashboard" active={focused} />,
        }}
      />
      <Tab.Screen
        name="ScreeningsTab"
        component={DistrictScreeningsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Screenings" active={focused} />,
        }}
      />
      <Tab.Screen
        name="ReferralsTab"
        component={DistrictReferralsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Referrals" active={focused} />,
        }}
      />
      <Tab.Screen
        name="ResourcePlanningTab"
        component={DistrictResourcePlanningScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Capacity" active={focused} />,
        }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={DistrictReportsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Reports" active={focused} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerTitle: 'District Settings',
          headerStyle: { backgroundColor: COLORS.surface },
          headerTitleStyle: { color: COLORS.textPrimary, fontWeight: FONTS.weightSemiBold },
          tabBarIcon: ({ focused }) => <TabIcon label="Settings" active={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function DistrictNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.accent,
        headerTitleStyle: { fontWeight: FONTS.weightSemiBold, fontSize: FONTS.sizeMD, color: COLORS.textPrimary },
        headerShadowVisible: true,
      }}
    >
      <Stack.Screen
        name="DistrictTabs"
        component={DistrictTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SharedScreeningDetail"
        component={SharedScreeningDetailScreen}
        options={{ title: 'Screening Case Record' }}
      />
      <Stack.Screen
        name="Evidence"
        component={EvidenceScreen}
        options={{ title: 'Explainable AI Evidence' }}
      />
    </Stack.Navigator>
  );
}
