// ============================================================
// RETINOVA — Unified 3-Role Authentication Screen
// Figma Make Source of Truth — Polished Healthcare UI System
// Features: Online Auth, Offline Field Mode, Runtime Server IP Config
// ============================================================
import React, { useState, useEffect } from 'react';
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
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { FormInput, Button, RetinovaLogo } from '../components';
import { storage } from '../services/storage';
import { getApiBaseUrl, setApiBaseUrl, pingServer } from '../services/api';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  FONT_FAMILY,
  STORAGE_KEYS,
} from '../utils/constants';

interface DemoUserCard {
  email: string;
  name: string;
  role: 'healthcare_worker' | 'doctor' | 'district_manager';
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
  const { login, loginOffline } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;

  const [email, setEmail] = useState('asha.worker@netra-ai.org');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);
  const [offlineLoading, setOfflineLoading] = useState(false);

  // Runtime Server Configuration State
  const defaultApiUrl = getApiBaseUrl() || (process.env.EXPO_PUBLIC_API_BASE_URL && process.env.EXPO_PUBLIC_API_BASE_URL.startsWith('http') ? process.env.EXPO_PUBLIC_API_BASE_URL : 'https://retinova-backend-0c11.onrender.com');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(defaultApiUrl);
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [pingMessage, setPingMessage] = useState<string>('');

  useEffect(() => {
    storage.getItem(STORAGE_KEYS.API_BASE_URL).then((stored) => {
      // Reject stale local/private development IP addresses from previous debug runs
      const isPrivateDevIp = stored && (
        stored.includes('10.99.') ||
        stored.includes('10.63.') ||
        stored.includes('192.168.') ||
        stored.includes('localhost') ||
        stored.includes('127.0.0.1')
      );
      if (stored && stored.startsWith('http') && !isPrivateDevIp) {
        setServerUrlInput(stored);
      } else {
        const current = getApiBaseUrl();
        if (current && current.startsWith('http') && !isPrivateDevIp) {
          setServerUrlInput(current);
        } else {
          const prodUrl = 'https://retinova-backend-0c11.onrender.com';
          setServerUrlInput(prodUrl);
          storage.setItem(STORAGE_KEYS.API_BASE_URL, prodUrl);
        }
      }
    });
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Required', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      const msg = err.message || '';
      if (
        msg.includes('Connection unavailable') ||
        msg.includes('Cannot connect') ||
        msg.includes('Network request failed') ||
        msg.includes('timed out')
      ) {
        Alert.alert(
          'Server Connection Unavailable',
          `Cannot reach RETINOVA server at:\n${getApiBaseUrl()}\n\nTip: You can continue immediately in Offline Field Mode (no internet needed) or adjust the Server IP address.`,
          [
            {
              text: '⚡ Continue in Offline Mode',
              onPress: () => handleOfflineLogin(),
            },
            {
              text: '⚙️ Configure Server IP',
              onPress: () => setShowServerConfig(true),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Login Failed', msg || 'Invalid credentials. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOfflineLogin = async () => {
    const selectedDemo = DEMO_ACCOUNTS.find((d) => d.email === email);
    const role = selectedDemo?.role || 'healthcare_worker';
    setOfflineLoading(true);
    try {
      await loginOffline(role);
    } catch (err: any) {
      Alert.alert('Offline Mode Error', err.message || 'Unable to enter offline mode.');
    } finally {
      setOfflineLoading(false);
    }
  };

  const handleTestAndSaveServer = async () => {
    const trimmed = serverUrlInput.trim().replace(/\/$/, '');
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      Alert.alert('Invalid URL', 'Server URL must start with http:// or https://');
      return;
    }
    setPingStatus('testing');
    setPingMessage('Testing connection...');
    setApiBaseUrl(trimmed);
    await storage.setItem(STORAGE_KEYS.API_BASE_URL, trimmed);

    const res = await pingServer();
    if (res.ok) {
      setPingStatus('success');
      setPingMessage(`Connected successfully (${res.latencyMs}ms)`);
      Alert.alert('Connection Successful', `Connected to RETINOVA server at ${trimmed}`);
    } else {
      setPingStatus('failed');
      setPingMessage(res.error || 'Server unreachable at this address');
      Alert.alert(
        'Server Unreachable',
        `Could not reach ${trimmed}.\n\nPlease ensure your phone is on the same Wi-Fi network as your PC and the server is running.`
      );
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
              <Text style={styles.facilityText}>District Health Administration · Edge AI</Text>
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
              title={loading ? 'Authenticating...' : 'Sign In with Server'}
              onPress={handleLogin}
              loading={loading}
              fullWidth
            />

            {/* Offline-First Emergency Screening Bypass */}
            <TouchableOpacity
              style={styles.offlineButton}
              onPress={handleOfflineLogin}
              disabled={offlineLoading || loading}
              activeOpacity={0.8}
            >
              {offlineLoading ? (
                <ActivityIndicator size="small" color={COLORS.teal800} />
              ) : (
                <>
                  <Text style={styles.offlineButtonIcon}>⚡</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.offlineButtonTitle}>Continue in Offline Field Mode</Text>
                    <Text style={styles.offlineButtonSubtitle}>
                      Zero internet required · On-device Swin V2 AI & SQLite storage
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Collapsible Server Connection Bar */}
          <View style={styles.serverCard}>
            <TouchableOpacity
              style={styles.serverHeaderRow}
              onPress={() => setShowServerConfig(!showServerConfig)}
              activeOpacity={0.7}
            >
              <View style={[styles.statusDot, styles[pingStatus]]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.serverHeaderTitle}>Server Connection Settings</Text>
                <Text style={styles.serverHeaderUrl} numberOfLines={1}>
                  {serverUrlInput}
                </Text>
              </View>
              <Text style={styles.serverChevron}>{showServerConfig ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {showServerConfig && (
              <View style={styles.serverConfigBody}>
                <Text style={styles.serverInputLabel}>RETINOVA Server Address</Text>
                <TextInput
                  style={styles.serverInput}
                  value={serverUrlInput}
                  onChangeText={setServerUrlInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="https://your-service.onrender.com"
                  placeholderTextColor={COLORS.slate400}
                />

                {/* Quick Server presets */}
                <View style={styles.quickPresetRow}>
                  <TouchableOpacity
                    style={styles.presetChip}
                    onPress={() => setServerUrlInput(process.env.EXPO_PUBLIC_API_BASE_URL || 'https://retinova-backend-0c11.onrender.com')}
                  >
                    <Text style={styles.presetChipText}>Cloud (Render Hosted)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetChip}
                    onPress={() => setServerUrlInput('http://10.0.2.2:5000')}
                  >
                    <Text style={styles.presetChipText}>Emulator (10.0.2.2)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.presetChip}
                    onPress={() => setServerUrlInput('http://localhost:5000')}
                  >
                    <Text style={styles.presetChipText}>Localhost (:5000)</Text>
                  </TouchableOpacity>
                </View>

                {pingMessage ? (
                  <Text
                    style={[
                      styles.pingMessage,
                      { color: pingStatus === 'success' ? COLORS.green700 : COLORS.maroon700 },
                    ]}
                  >
                    {pingStatus === 'success' ? '✓ ' : '✕ '}
                    {pingMessage}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={styles.serverSaveButton}
                  onPress={handleTestAndSaveServer}
                  disabled={pingStatus === 'testing'}
                >
                  {pingStatus === 'testing' ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.serverSaveButtonText}>Save & Test Server Connection</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Footer */}
          <Text style={styles.footerNote}>
            RETINOVA v2.4 · Autonomous Retinal Triage Platform · Offline-First Architecture
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
  containerBox: { width: '100%', maxWidth: 460 },
  desktopBox: { maxWidth: 460 },

  // Brand Area
  brandArea: {
    alignItems: 'center',
    marginBottom: 24,
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
    marginBottom: 16,
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

  // Offline Button
  offlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.teal50,
    borderWidth: 1.5,
    borderColor: COLORS.teal200,
    borderRadius: RADIUS.md,
    padding: 12,
    marginTop: 14,
    gap: 10,
  },
  offlineButtonIcon: {
    fontSize: 20,
  },
  offlineButtonTitle: {
    fontSize: 13,
    fontWeight: FONTS.weightBold,
    color: COLORS.teal900,
    fontFamily: FONT_FAMILY.body,
  },
  offlineButtonSubtitle: {
    fontSize: 11,
    color: COLORS.teal700,
    marginTop: 2,
    lineHeight: 15,
    fontFamily: FONT_FAMILY.body,
  },

  // Server Card
  serverCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 12,
    marginBottom: 16,
  },
  serverHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  idle: {
    backgroundColor: COLORS.slate400,
  },
  testing: {
    backgroundColor: COLORS.amber700,
  },
  success: {
    backgroundColor: COLORS.green700,
  },
  failed: {
    backgroundColor: COLORS.maroon700,
  },
  serverHeaderTitle: {
    fontSize: 12,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.navy800,
    fontFamily: FONT_FAMILY.body,
  },
  serverHeaderUrl: {
    fontSize: 11,
    color: COLORS.slate500,
    fontFamily: FONT_FAMILY.body,
  },
  serverChevron: {
    fontSize: 10,
    color: COLORS.slate400,
  },
  serverConfigBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  serverInputLabel: {
    fontSize: 11,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.slate700,
    marginBottom: 6,
    fontFamily: FONT_FAMILY.body,
  },
  serverInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.navy800,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
  },
  quickPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  presetChip: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  presetChipText: {
    fontSize: 10,
    color: COLORS.slate700,
  },
  pingMessage: {
    fontSize: 11,
    fontWeight: FONTS.weightSemiBold,
    marginBottom: 8,
  },
  serverSaveButton: {
    backgroundColor: COLORS.navy800,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverSaveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: FONTS.weightSemiBold,
  },

  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.slate400,
    marginTop: 4,
    fontFamily: FONT_FAMILY.body,
  },
});
