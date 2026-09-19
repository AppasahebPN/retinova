// ============================================================
// RETINOVA — ASHA Screener Navigator (Role 1: healthcare_worker)
// Field Mobile Workflow — Mobile-first
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { COLORS, FONTS, RADIUS } from '../utils/constants';
import type {
  AshaTabParamList, AshaHomeStackParamList, AshaHistoryStackParamList,
} from '../types';

import HomeScreen from '../screens/HomeScreen';
import PatientSearchScreen from '../screens/PatientSearchScreen';
import NewPatientScreen from '../screens/NewPatientScreen';
import EyeSelectionScreen from '../screens/EyeSelectionScreen';
import ImageCaptureScreen from '../screens/ImageCaptureScreen';
import ImagePreviewScreen from '../screens/ImagePreviewScreen';
import ProcessingScreen from '../screens/ProcessingScreen';
import ScreeningResultScreen from '../screens/ScreeningResultScreen';
import EvidenceScreen from '../screens/EvidenceScreen';
import ReferralScreen from '../screens/ReferralScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ScreeningDetailScreen from '../screens/ScreeningDetailScreen';
import SharedScreeningDetailScreen from '../screens/shared/SharedScreeningDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator<AshaTabParamList>();
const HomeStack = createNativeStackNavigator<AshaHomeStackParamList>();
const HistoryStack = createNativeStackNavigator<AshaHistoryStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.accent,
  headerTitleStyle: { fontWeight: FONTS.weightSemiBold, fontSize: FONTS.sizeMD, color: COLORS.textPrimary },
  headerShadowVisible: true,
};

function AshaHomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={screenOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <HomeStack.Screen name="PatientSearch" component={PatientSearchScreen} options={{ title: 'Find Patient' }} />
      <HomeStack.Screen name="NewPatient" component={NewPatientScreen} options={{ title: 'Register Patient' }} />
      <HomeStack.Screen name="EyeSelection" component={EyeSelectionScreen} options={{ title: 'Select Eye' }} />
      <HomeStack.Screen name="ImageCapture" component={ImageCaptureScreen} options={{ title: 'Capture Fundus Image' }} />
      <HomeStack.Screen name="ImagePreview" component={ImagePreviewScreen} options={{ title: 'Image Preview' }} />
      <HomeStack.Screen name="Processing" component={ProcessingScreen} options={{ title: 'AI Screening', headerBackVisible: false, gestureEnabled: false }} />
      <HomeStack.Screen name="ScreeningResult" component={ScreeningResultScreen} options={{ title: 'Screening Result', headerBackVisible: false }} />
      <HomeStack.Screen name="Evidence" component={EvidenceScreen} options={{ title: 'Clinical Evidence' }} />
      <HomeStack.Screen name="Referral" component={ReferralScreen} options={{ title: 'Create Referral' }} />
      <HomeStack.Screen name="SharedScreeningDetail" component={SharedScreeningDetailScreen} options={{ title: 'Case Record' }} />
    </HomeStack.Navigator>
  );
}

function AshaHistoryNavigator() {
  return (
    <HistoryStack.Navigator screenOptions={screenOptions}>
      <HistoryStack.Screen name="History" component={HistoryScreen} options={{ title: 'Screening History' }} />
      <HistoryStack.Screen name="ScreeningDetail" component={ScreeningDetailScreen} options={{ title: 'Screening Detail' }} />
      <HistoryStack.Screen name="SharedScreeningDetail" component={SharedScreeningDetailScreen} options={{ title: 'Case Record' }} />
      <HistoryStack.Screen name="Evidence" component={EvidenceScreen} options={{ title: 'Clinical Evidence' }} />
      <HistoryStack.Screen name="Referral" component={ReferralScreen} options={{ title: 'Referral' }} />
    </HistoryStack.Navigator>
  );
}

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
  bar: { width: 24, height: 3, borderRadius: RADIUS.sm, backgroundColor: 'transparent', marginBottom: 5 },
  barActive: { backgroundColor: COLORS.accent },
  iconLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: FONTS.weightMedium, letterSpacing: 0.5 },
  iconLabelActive: { color: COLORS.accent, fontWeight: FONTS.weightBold },
});

export default function AshaNavigator() {
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
        name="HomeTab"
        component={AshaHomeNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Home" active={focused} />,
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={AshaHistoryNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="History" active={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerTitle: 'ASHA Settings',
          headerStyle: { backgroundColor: COLORS.surface },
          headerTitleStyle: { color: COLORS.textPrimary, fontWeight: FONTS.weightSemiBold },
          tabBarIcon: ({ focused }) => <TabIcon label="Settings" active={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}
