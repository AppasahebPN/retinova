// ============================================================
// RETINOVA — Reviewing Doctor Navigator (Role 3: doctor)
// Specialist Ophthalmology Workstation
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS, FONTS } from '../utils/constants';
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
const Stack = createNativeStackNavigator<DoctorStackParamList>();

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
  bar: { width: 24, height: 3, borderRadius: 2, backgroundColor: 'transparent', marginBottom: 5 },
  barActive: { backgroundColor: COLORS.accent },
  iconLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: FONTS.weightMedium, letterSpacing: 0.5 },
  iconLabelActive: { color: COLORS.accent, fontWeight: FONTS.weightBold },
});

function DoctorTabNavigator() {
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
        name="ReviewQueueTab"
        component={DoctorReviewQueueScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Review Queue" active={focused} />,
        }}
      />
      <Tab.Screen
        name="CasesTab"
        component={DoctorCasesScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="All Cases" active={focused} />,
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerTitle: 'Doctor Workstation Settings',
          headerStyle: { backgroundColor: COLORS.surface },
          headerTitleStyle: { color: COLORS.textPrimary, fontWeight: FONTS.weightSemiBold },
          tabBarIcon: ({ focused }) => <TabIcon label="Settings" active={focused} />,
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
        headerTintColor: COLORS.accent,
        headerTitleStyle: { fontWeight: FONTS.weightSemiBold, fontSize: FONTS.sizeMD, color: COLORS.textPrimary },
        headerShadowVisible: true,
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
