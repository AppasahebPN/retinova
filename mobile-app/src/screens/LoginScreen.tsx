// ============================================================
// RETINOVA — Unified 3-Role Authentication Screen
// Figma Make Source of Truth — Polished Healthcare UI System
// ============================================================
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { FormInput, Button, RetinovaLogo } from '../components';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  FONT_FAMILY,
} from '../utils/constants';

interface DemoUserCard {
  email: string;
  name: string;
  role: string;
  roleTitle: string;
  icon: string;
  description: string;
}

const DEMO_ACCOUNTS: DemoUserCard[] = [
  {
    email: 'asha.worker@netra-ai.org',
    name: 'Primary Health Screener / ASHA',
    role: 'healthcare_worker',
    roleTitle: 'ASHA Worker',
    icon: '👥',
    description: 'Field screening triage, patient registration & fundus evaluation',
  },
  {
    email: 'doctor@netra-ai.org',
    name: 'District Reviewing Ophthalmologist',
    role: 'doctor',
    roleTitle: 'Reviewing Ophthalmologist',
    icon: '👁️',
    description: 'Specialist clinical review: original fundus, Grad-CAM & clinical disposition',
  },
  {
    email: 'manager@netra-ai.org',
    name: 'District Health Officer',
    role: 'district_manager',
    roleTitle: 'District Manager',
    icon: '📊',
    description: 'Operational command center, facility performance & referral tracking',
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
      style={{ flex: 1, width: '100%' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, isDesktop && styles.desktopContent]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        <View style={[styles.containerBox, isDesktop && styles.desktopBox]}>
          {/* Figma Style Top Logo & Brand Area */}
          <View style={styles.brandArea}>
            <RetinovaLogo size="lg" />
            <Text style={styles.brandSubtitle}>Tele-ophthalmology screening platform</Text>
            <View style={styles.facilityPill}>
              <View style={styles.dot} />
              <Text style={styles.facilityText}>District Health Administration</Text>
            </View>
          </View>

          {/* Figma Role Cards as Profile Selection */}
          <View style={styles.roleSelectionGroup}>
            <Text style={styles.sectionLabel}>SELECT ROLE PROFILE</Text>
            {DEMO_ACCOUNTS.map((d) => {
              const isSelected = email === d.email;
              return (
                <TouchableOpacity
                  key={d.email}
                  style={[styles.roleCard, isSelected && styles.roleCardActive]}
                  onPress={() => selectDemoAccount(d)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.roleIconBox, isSelected && styles.roleIconBoxActive]}>
                    <Text style={styles.roleIconText}>{d.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.roleCardTitle, isSelected && styles.roleCardTitleActive]}>
                      {d.roleTitle}
                    </Text>
                    <Text style={styles.roleCardSubtitle}>{d.description}</Text>
                  </View>
                  <Text style={[styles.roleChevron, isSelected && styles.roleChevronActive]}>›</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Credentials Form Card */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Sign In</Text>
            <Text style={styles.formSub}>Enter password for selected institutional account</Text>

            <FormInput
              label="Account Email"
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

          {/* Footer Without Unsupported Claims */}
          <Text style={styles.footerNote}>
            RETINOVA v2.4 · Autonomous Retinal Triage Platform · © 2026
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, width: '100%', backgroundColor: COLORS.background },
  content: {
    flexGrow: 1,
    padding: SPACING.lg,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  desktopContent: { paddingVertical: 48 },
  containerBox: { width: '100%', maxWidth: 440 },
  desktopBox: { maxWidth: 440 },

  // Brand Area
  brandArea: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandSubtitle: {
    fontSize: 15,
    color: COLORS.slate500,
    marginTop: 10,
    fontFamily: FONT_FAMILY.body,
    textAlign: 'center',
  },
  facilityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.teal50,
    borderWidth: 1,
    borderColor: COLORS.teal100,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.teal700,
  },
  facilityText: {
    fontSize: 12,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.teal800,
    fontFamily: FONT_FAMILY.body,
  },

  // Role Cards Selection
  roleSelectionGroup: {
    marginBottom: SPACING.lg,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: FONTS.weightBold,
    color: COLORS.slate500,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom: 4,
    fontFamily: FONT_FAMILY.body,
  },
  roleCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.card,
  },
  roleCardActive: {
    borderColor: COLORS.teal800,
    backgroundColor: COLORS.teal50,
  },
  roleIconBox: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconBoxActive: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.teal700,
  },
  roleIconText: { fontSize: 18 },
  roleCardTitle: {
    fontSize: 14,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    fontFamily: FONT_FAMILY.body,
  },
  roleCardTitleActive: {
    color: COLORS.teal800,
  },
  roleCardSubtitle: {
    fontSize: 12,
    color: COLORS.slate500,
    marginTop: 2,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.body,
  },
  roleChevron: {
    fontSize: 22,
    color: COLORS.slate400,
    fontWeight: FONTS.weightBold,
  },
  roleChevronActive: {
    color: COLORS.teal800,
  },

  // Form Card
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 20,
    marginBottom: 20,
    ...SHADOWS.card,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: FONTS.weightBold,
    fontFamily: FONT_FAMILY.display,
    color: COLORS.navy800,
  },
  formSub: {
    fontSize: 12,
    color: COLORS.slate500,
    marginTop: 2,
    marginBottom: 16,
    fontFamily: FONT_FAMILY.body,
  },

  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.slate400,
    marginTop: 8,
    fontFamily: FONT_FAMILY.body,
  },
});
