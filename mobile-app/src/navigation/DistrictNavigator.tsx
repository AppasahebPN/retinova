// ============================================================
// RETINOVA — District Manager Navigator (Role 2: district_manager)
// Figma Make Source of Truth — Polished Healthcare UI System
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createPlatformStackNavigator } from './createPlatformStackNavigator';
import { COLORS, FONTS, RADIUS, FONT_FAMILY } from '../utils/constants';
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
const Stack = createPlatformStackNavigator<DistrictStackParamList>();

function TabIcon({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={tabStyles.iconWrap}>
      <View style={[tabStyles.bar, active && tabStyles.barActive]} />
      <Text style={[tabStyles.iconLabel, active && tabStyles.iconLabelActive]}>{label}</Text>
    </View>
  );
}
const tabStyles = StyleSheet.create({
  iconWrap: { alignItems: 'center', paddingTop: 6, minWidth: 54 },
  bar: { width: 24, height: 3, borderRadius: RADIUS.full, backgroundColor: 'transparent', marginBottom: 5 },
  barActive: { backgroundColor: COLORS.teal800 },
  iconLabel: {
    fontSize: 9.5,
    color: COLORS.slate400,
    fontWeight: FONTS.weightBold,
    letterSpacing: 0.6,
    fontFamily: FONT_FAMILY.body,
  },
  iconLabelActive: { color: COLORS.teal800 },
});

function DistrictTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        detachInactiveScreens: true,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.borderSubtle,
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
          tabBarIcon: ({ focused }) => <TabIcon label="DASHBOARD" active={focused} />,
        }}
      />
      <Tab.Screen
        name="ScreeningsTab"
        component={DistrictScreeningsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="SCREENINGS" active={focused} />,
        }}
      />
      <Tab.Screen
        name="ReferralsTab"
        component={DistrictReferralsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="REFERRALS" active={focused} />,
        }}
      />
      <Tab.Screen
        name="ResourcePlanningTab"
        component={DistrictResourcePlanningScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="CAPACITY" active={focused} />,
        }}
      />
      <Tab.Screen
        name="ReportsTab"
        component={DistrictReportsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="REPORTS" active={focused} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerTitle: 'District Settings',
          headerStyle: { backgroundColor: COLORS.surface },
          headerTitleStyle: {
            fontFamily: FONT_FAMILY.display,
            fontWeight: FONTS.weightBold,
            color: COLORS.navy800,
          },
          tabBarIcon: ({ focused }) => <TabIcon label="SETTINGS" active={focused} />,
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
        headerTintColor: COLORS.teal800,
        headerTitleStyle: {
          fontFamily: FONT_FAMILY.display,
          fontWeight: FONTS.weightBold,
          fontSize: 18,
          color: COLORS.navy800,
        },
        headerShadowVisible: false,
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
