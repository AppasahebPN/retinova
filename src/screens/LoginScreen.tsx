// ============================================================
// RETINOVA — Unified 3-Role Authentication Screen
// Institutional Public Health & Clinical Workstation Aesthetic
// ============================================================
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, KeyboardAvoidingView, Platform, useWindowDimensions,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { FormInput, Button } from '../components';
import { COLORS, FONTS, SPACING, RADIUS } from '../utils/constants';

interface DemoUserCard {
  email: string;
  name: string;
  role: string;
  roleTitle: string;
  badge: string;
  description: string;
}

const DEMO_ACCOUNTS: DemoUserCard[] = [
  {
    email: 'asha.worker@netra-ai.org',
    name: 'Primary Health Screener / ASHA',
    role: 'healthcare_worker',
    roleTitle: 'ASHA Screener',
    badge: 'Field Workflow',
    description: 'Patient search/registration, fundus capture, immediate AI screening triage, and referral creation.',
  },
  {
    email: 'manager@netra-ai.org',
    name: 'District Health Officer',
    role: 'district_manager',
    roleTitle: 'District Manager',
    badge: 'Command Center',
    description: 'District monitoring, facility performance, referral tracking, and Simulink capacity planning.',
  },
  {
    email: 'doctor@netra-ai.org',
    name: 'District Reviewing Ophthalmologist',
    role: 'doctor',
    roleTitle: 'Reviewing Doctor',
    badge: 'Clinical Workstation',
    description: 'Specialist tri-panel review: original fundus, Grad-CAM, candidate lesions, and clinical outcome entry.',
  },
];

export default function LoginScreen() {
  const { login } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;

  const [email, setEmail] = useState('asha.worker@netra-ai.org');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectDemoAccount = (demo: DemoUserCard) => {
    setEmail(demo.email);
    setPassword('demo1234');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, isDesktop && styles.desktopContent]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.containerBox, isDesktop && styles.desktopBox]}>
          {/* Institutional Top Banner */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Text style={styles.appName}>RETINOVA</Text>
              <View style={styles.govTag}>
                <Text style={styles.govTagText}>Public Health</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Unified Diabetic Retinopathy Screening & Clinical Platform</Text>
            <Text style={styles.subtext}>
              Autonomous retinal triage across Primary Health Centers, District Offices, and Tertiary Eye Care.
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Sign In to RETINOVA</Text>
            <Text style={styles.cardSubtitle}>Enter your institutional credentials or select a role profile below.</Text>

            <FormInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="user@netra-ai.org"
            />
            <FormInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />

            <Button
              title={loading ? 'Authenticating...' : 'Sign In'}
              onPress={handleLogin}
              loading={loading}
              fullWidth
            />
          </View>

          {/* Demo Role Switcher */}
          <View style={styles.demoSection}>
            <View style={styles.demoHeader}>
              <Text style={styles.demoLabel}>Select Institutional Role Profile</Text>
              <Text style={styles.demoHint}>Tap to pre-fill credentials</Text>
            </View>

            {DEMO_ACCOUNTS.map((d) => {
              const isSelected = email === d.email;
              return (
                <TouchableOpacity
                  key={d.email}
                  style={[styles.roleCard, isSelected && styles.roleCardActive]}
                  onPress={() => selectDemoAccount(d)}
                  activeOpacity={0.7}
                >
                  <View style={styles.roleCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.roleTitle, isSelected && styles.roleTitleActive]}>
                        {d.roleTitle}
                      </Text>
                      <Text style={styles.roleEmail}>{d.email}</Text>
                    </View>
                    <View style={[styles.badgePill, isSelected && styles.badgePillActive]}>
                      <Text style={[styles.badgeText, isSelected && styles.badgeTextActive]}>
                        {d.badge}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.roleDesc}>{d.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              RETINOVA is a certified clinical decision support platform. Screening determinations are intended for prioritization and referral triage. Final clinical diagnosis is performed by qualified ophthalmologists.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingTop: 40, alignItems: 'center' },
  desktopContent: { paddingTop: 60 },
  containerBox: { width: '100%', maxWidth: 540 },
  desktopBox: { width: 540 },
  header: { alignItems: 'center', marginBottom: SPACING.xl },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  appName: { fontSize: 32, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 4 },
  govTag: { backgroundColor: COLORS.accentLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, marginLeft: SPACING.sm, borderWidth: 1, borderColor: COLORS.accent },
  govTagText: { fontSize: 10, fontWeight: FONTS.weightBold, color: COLORS.accent, letterSpacing: 0.5 },
  subtitle: { fontSize: FONTS.sizeMD, color: COLORS.textPrimary, fontWeight: FONTS.weightSemiBold, textAlign: 'center', marginTop: 4 },
  subtext: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, textAlign: 'center', marginTop: 4, lineHeight: 17, paddingHorizontal: SPACING.md },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  cardTitle: { fontSize: FONTS.sizeXL, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, marginBottom: 2 },
  cardSubtitle: { fontSize: FONTS.sizeSM, color: COLORS.textMuted, marginBottom: SPACING.lg },
  demoSection: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  demoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  demoLabel: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.textMuted, letterSpacing: 0.5 },
  demoHint: { fontSize: 11, color: COLORS.accent, fontStyle: 'italic' },
  roleCard: {
    backgroundColor: COLORS.surfaceAlt,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: SPACING.sm,
  },
  roleCardActive: {
    backgroundColor: COLORS.accentLight,
    borderColor: COLORS.accent,
  },
  roleCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  roleTitle: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  roleTitleActive: { color: COLORS.accentDark },
  roleEmail: { fontSize: FONTS.sizeXS, color: COLORS.textMuted },
  badgePill: { backgroundColor: COLORS.surfaceAlt, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  badgePillActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  badgeText: { fontSize: 9, fontWeight: FONTS.weightBold, color: COLORS.textSecondary },
  badgeTextActive: { color: '#fff' },
  roleDesc: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, marginTop: 4, lineHeight: 16 },
  disclaimer: {
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3.5,
    borderLeftColor: COLORS.info,
    marginBottom: SPACING.xl,
  },
  disclaimerText: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, lineHeight: 16, textAlign: 'center' },
});
