// ============================================================
// RETINOVA — Root Navigator with Role-Based Route Guards (RBAC)
// Ensures users cannot access screens belonging to another role
// ============================================================
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import LoginScreen from '../screens/LoginScreen';
import AshaNavigator from './AshaNavigator';
import DistrictNavigator from './DistrictNavigator';
import DoctorNavigator from './DoctorNavigator';
import type { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { token, user } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!token || !user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : user.role === 'healthcare_worker' ? (
        <Stack.Screen name="AshaRoot" component={AshaNavigator} />
      ) : user.role === 'district_manager' || user.role === 'admin' ? (
        <Stack.Screen name="DistrictRoot" component={DistrictNavigator} />
      ) : user.role === 'doctor' ? (
        <Stack.Screen name="DoctorRoot" component={DoctorNavigator} />
      ) : (
        <Stack.Screen name="AshaRoot" component={AshaNavigator} />
      )}
    </Stack.Navigator>
  );
}
