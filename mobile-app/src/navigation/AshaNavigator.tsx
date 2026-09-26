// ============================================================
// RETINOVA — ASHA Worker Navigator (Role 1: healthcare_worker)
// Figma Make Source of Truth — Polished Healthcare UI System
// ============================================================
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createPlatformStackNavigator } from './createPlatformStackNavigator';
import { COLORS, FONTS, RADIUS, FONT_FAMILY } from '../utils/constants';
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
const HomeStack = createPlatformStackNavigator<AshaHomeStackParamList>();
const HistoryStack = createPlatformStackNavigator<AshaHistoryStackParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: COLORS.surface },
  headerTintColor: COLORS.teal800,
  headerTitleStyle: {
    fontFamily: FONT_FAMILY.display,
    fontWeight: FONTS.weightBold,
    fontSize: 18,
    color: COLORS.navy800,
  },
  headerShadowVisible: false,
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

export default function AshaNavigator() {
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
        name="HomeTab"
        component={AshaHomeNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="HOME" active={focused} />,
        }}
      />
      <Tab.Screen
        name="HistoryTab"
        component={AshaHistoryNavigator}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="HISTORY" active={focused} />,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          headerTitle: 'ASHA Settings',
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
