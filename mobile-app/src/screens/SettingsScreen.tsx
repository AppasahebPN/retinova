import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { storage } from "../services/storage";
import { setApiBaseUrl, getApiBaseUrl, pingServer } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { FormInput, Button, SectionHeader, InfoRow, RetinovaLogo } from "../components";
import { useBackground } from "../context/BackgroundContext";
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  FONT_FAMILY,
  STORAGE_KEYS,
} from "../utils/constants";

type PingStatus = "idle" | "checking" | "ok" | "error";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { backgroundId, setBackgroundId, options: bgOptions } = useBackground();
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pingStatus, setPingStatus] = useState<PingStatus>("idle");
  const [pingInfo, setPingInfo] = useState("");

  useEffect(() => {
    storage.getItem(STORAGE_KEYS.API_BASE_URL).then((v) => {
      if (v) setApiUrl(v);
    });
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setPingStatus("checking");
    setPingInfo("");
    const result = await pingServer();
    if (result.ok) {
      setPingStatus("ok");
      setPingInfo(`Connected · ${result.latencyMs}ms`);
    } else {
      setPingStatus("error");
      setPingInfo(result.error || "Unreachable");
    }
  };

  const saveUrl = async () => {
    const trimmed = apiUrl.trim().replace(/\/$/, "");
    if (!trimmed.startsWith("http")) {
      Alert.alert("Invalid URL", "API URL must start with http:// or https://");
      return;
    }
    setSaving(true);
    try {
      await storage.setItem(STORAGE_KEYS.API_BASE_URL, trimmed);
      setApiBaseUrl(trimmed);
      Alert.alert("Saved", "API server URL updated successfully.");
      checkConnection();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const pingColor =
    pingStatus === "ok"
      ? COLORS.green700
      : pingStatus === "error"
      ? COLORS.maroon700
      : COLORS.slate400;

  const roleDisplay =
    user?.role === "healthcare_worker"
      ? "ASHA Worker"
      : user?.role === "doctor"
      ? "Reviewing Ophthalmologist"
      : user?.role === "district_manager"
      ? "District Manager"
      : user?.role || "User";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.innerContainer}>
          <View style={styles.headerArea}>
            <RetinovaLogo size="sm" />
            <Text style={styles.title}>System Settings</Text>
            <Text style={styles.subtitle}>Account profile & connectivity configuration</Text>
          </View>

          {/* Account Profile Card */}
          <View style={styles.card}>
            <SectionHeader title="Active Account Profile" />
            <InfoRow label="Name" value={user?.full_name} />
            <InfoRow label="Role" value={roleDisplay} />
            <InfoRow label="Email" value={user?.email} />
            <InfoRow
              label="Facility"
              value={user?.facility?.name || user?.facility_id || "District Health Administration"}
            />
          </View>

          {/* Application Background Theme Card */}
          <View style={styles.card}>
            <SectionHeader title="Application Background" />
            <Text style={styles.bgDesc}>
              Personalize the visual backdrop rendered across all screening and workstation pages.
            </Text>
            <View style={styles.bgOptionsWrap}>
              {bgOptions.map((opt) => {
                const isActive = opt.id === backgroundId;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.bgOptionCard, isActive && styles.bgOptionCardActive]}
                    onPress={() => setBackgroundId(opt.id)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={opt.title}
                  >
                    <View style={[styles.bgRadio, isActive && styles.bgRadioActive]}>
                      {isActive && <View style={styles.bgRadioInner} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.bgOptionTitle, isActive && styles.bgOptionTitleActive]}>
                        {opt.title}
                      </Text>
                      <Text style={styles.bgOptionSub}>{opt.subtitle}</Text>
                    </View>
                    {isActive && (
                      <View style={styles.activePill}>
                        <Text style={styles.activePillText}>ACTIVE</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Connection Status Card */}
          <View style={styles.card}>
            <SectionHeader title="API Connectivity" />
            <View style={styles.connRow}>
              <View style={[styles.connDot, { backgroundColor: pingColor }]} />
              <Text style={[styles.connText, { color: pingColor }]}>
                {pingStatus === "checking"
                  ? "Checking connection..."
                  : pingStatus === "ok"
                  ? `Server Online · ${pingInfo}`
                  : pingStatus === "error"
                  ? `Offline · ${pingInfo}`
                  : "Not checked"}
              </Text>
            </View>
            <Text style={styles.connUrl}>{getApiBaseUrl()}</Text>
            <View style={{ marginTop: SPACING.md }}>
              <Button
                title={pingStatus === "checking" ? "Checking..." : "Verify Connection"}
                onPress={checkConnection}
                variant="secondary"
                loading={pingStatus === "checking"}
                fullWidth
              />
            </View>
          </View>

          {/* About Platform Card */}
          <View style={styles.card}>
            <SectionHeader title="About RETINOVA" />
            <InfoRow label="Platform" value="RETINOVA Autonomous Retinal Triage" />
            <InfoRow label="Release" value="v2.4 Production" />
            <InfoRow label="Target" value="Public Health Diabetic Retinopathy Screening" />
          </View>

          {/* Advanced Developer Settings */}
          <TouchableOpacity
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced((v) => !v)}
            activeOpacity={0.7}
          >
            <Text style={styles.advancedToggleText}>
              {showAdvanced ? "▲ Technical Configuration" : "▼ Technical Configuration"}
            </Text>
            <Text style={styles.advancedToggleSub}>Server endpoint & base URL overrides</Text>
          </TouchableOpacity>

          {showAdvanced && (
            <View style={styles.card}>
              <Text style={styles.advancedWarning}>
                Configure server address when testing across local networks or staging environments.
              </Text>
              <FormInput
                label="API Base URL"
                value={apiUrl}
                onChangeText={setApiUrl}
                placeholder="http://SERVER_IP:5000"
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Button
                title={saving ? "Saving..." : "Save Endpoint"}
                onPress={saveUrl}
                loading={saving}
                fullWidth
              />
            </View>
          )}

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              RETINOVA supports field screening and specialist referral. Clinical management decisions
              must be confirmed by a licensed ophthalmologist.
            </Text>
          </View>

          <View style={{ marginTop: SPACING.lg }}>
            <Button title="Sign Out" onPress={logout} variant="danger" fullWidth />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 50, alignItems: "center" },
  innerContainer: { maxWidth: 540, width: "100%" },
  headerArea: { marginBottom: SPACING.md },
  title: {
    fontSize: 22,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    fontFamily: FONT_FAMILY.display,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.slate500,
    marginTop: 2,
    fontFamily: FONT_FAMILY.body,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  connRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: SPACING.xs,
  },
  connDot: { width: 10, height: 10, borderRadius: 5 },
  connText: {
    fontSize: 13,
    fontWeight: FONTS.weightSemiBold,
    fontFamily: FONT_FAMILY.body,
  },
  connUrl: {
    fontSize: 11,
    color: COLORS.slate400,
    fontFamily: FONT_FAMILY.mono,
    marginTop: 4,
  },
  advancedToggle: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: SPACING.md,
  },
  advancedToggleText: {
    fontSize: 13,
    fontWeight: FONTS.weightBold,
    color: COLORS.teal800,
    fontFamily: FONT_FAMILY.body,
  },
  advancedToggleSub: {
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 2,
    fontFamily: FONT_FAMILY.body,
  },
  advancedWarning: {
    fontSize: 12,
    color: COLORS.amber700,
    marginBottom: SPACING.md,
    fontFamily: FONT_FAMILY.body,
  },
  disclaimer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderLeftWidth: 3.5,
    borderLeftColor: COLORS.teal800,
    marginTop: SPACING.xs,
    ...SHADOWS.card,
  },
  disclaimerText: {
    fontSize: FONTS.sizeXS,
    color: COLORS.slate500,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: FONT_FAMILY.body,
  },
  bgDesc: {
    fontSize: 12,
    color: COLORS.slate500,
    marginBottom: SPACING.md,
    fontFamily: FONT_FAMILY.body,
  },
  bgOptionsWrap: {
    gap: SPACING.sm,
  },
  bgOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.surfaceAlt,
    gap: 12,
  },
  bgOptionCardActive: {
    borderColor: COLORS.teal800,
    backgroundColor: COLORS.teal50,
  },
  bgRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.slate400,
    alignItems: "center",
    justifyContent: "center",
  },
  bgRadioActive: {
    borderColor: COLORS.teal800,
  },
  bgRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.teal800,
  },
  bgOptionTitle: {
    fontSize: 14,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    fontFamily: FONT_FAMILY.body,
  },
  bgOptionTitleActive: {
    color: COLORS.teal800,
  },
  bgOptionSub: {
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 2,
    fontFamily: FONT_FAMILY.body,
  },
  activePill: {
    backgroundColor: COLORS.teal800,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: FONTS.weightBold,
    color: "#FFFFFF",
    fontFamily: FONT_FAMILY.body,
    letterSpacing: 0.5,
  },
});
