// ============================================================
// RETINOVA — Reviewing Doctor Navigator (Role 3: doctor)
// Figma Make Source of Truth — Polished Healthcare UI System
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createPlatformStackNavigator } from './createPlatformStackNavigator';
import { COLORS, FONTS, RADIUS, FONT_FAMILY } from '../utils/constants';
import type {
  DoctorTabParamList, DoctorStackParamList,
} from '../types';

import DoctorReviewQueueScreen from '../screens/doctor/DoctorReviewQueueScreen';
import DoctorCasesScreen from '../screens/doctor/DoctorCasesScreen';
import DoctorClinicalReviewScreen from '../screens/doctor/DoctorClinicalReviewScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SharedScreeningDetailScreen from '../screens/shared/SharedScreeningDetailScreen';
import EvidenceScreen from '../screens/EvidenceScreen';

const Tab = createBottomTabNavigator<DoctorTabParamList>();
const Stack = createPlatformStackNavigator<DoctorStackParamList>();

function TabIcon({ label, active }: { label: string; active: boolean }) {
  return (
    <View style={tabStyles.iconWrap}>
      <View style={[tabStyles.bar, active && tabStyles.barActive]} />
      <Text style={[tabStyles.iconLabel, active && tabStyles.iconLabelActive]}>{label}</Text>
    </View>
  );
}
const tabStyles = StyleSheet.create({
  iconWrap: { alignItems: 'center', paddingTop: 6, minWidth: 64 },
  bar: { width: 28, height: 3, borderRadius: RADIUS.full, backgroundColor: 'transparent', marginBottom: 5 },
  barActive: { backgroundColor: COLORS.teal800 },
  iconLabel: {
    fontSize: 10,
    color: COLORS.slate400,
    fontWeight: FONTS.weightBold,
    letterSpacing: 0.8,
    fontFamily: FONT_FAMILY.body,
  },
  iconLabelActive: { color: COLORS.teal800 },
});

function DoctorTabNavigator() {
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
        name="ReviewQueueTab"
        component={DoctorReviewQueueScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="REVIEW QUEUE" active={focused} />,
        }}
      />
      <Tab.Screen
        name="CasesTab"
        component={DoctorCasesScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="ALL CASES" active={focused} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Doctor Workstation Settings',
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

export default function DoctorNavigator() {
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
        name="DoctorTabs"
        component={DoctorTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="DoctorClinicalReview"
        component={DoctorClinicalReviewScreen}
        options={{ title: 'Clinical Review Workstation' }}
      />
      <Stack.Screen
        name="SharedScreeningDetail"
        component={SharedScreeningDetailScreen}
        options={{ title: 'Case Record' }}
      />
      <Stack.Screen
        name="Evidence"
        component={EvidenceScreen}
        options={{ title: 'Explainable AI Evidence' }}
      />
    </Stack.Navigator>
  );
}
