import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from "react-native";
import { storage } from "../services/storage";
import { setApiBaseUrl, getApiBaseUrl, pingServer } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { FormInput, Button, SectionHeader, InfoRow, Divider } from "../components";
import { COLORS, FONTS, SPACING, RADIUS, STORAGE_KEYS } from "../utils/constants";

type PingStatus = "idle" | "checking" | "ok" | "error";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl());
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pingStatus, setPingStatus] = useState<PingStatus>("idle");
  const [pingInfo, setPingInfo] = useState("");

  useEffect(() => {
    storage.getItem(STORAGE_KEYS.API_BASE_URL).then((v) => { if (v) setApiUrl(v); });
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setPingStatus("checking");
    setPingInfo("");
    const result = await pingServer();
    if (result.ok) {
      setPingStatus("ok");
      setPingInfo(`Connected     ${result.latencyMs}ms`);
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
    } finally { setSaving(false); }
  };

  const pingColor =
    pingStatus === "ok" ? COLORS.success :
    pingStatus === "error" ? COLORS.error :
    COLORS.textMuted;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Application Settings</Text>

        {/* Account */}
        <SectionHeader title="Account" />
        <InfoRow label="Name" value={user?.full_name} />
        <InfoRow label="Role" value={user?.role} />
        <InfoRow label="Email" value={user?.email} />
        <InfoRow label="Facility" value={user?.facility?.name || user?.facility_id} />

        {/* Connection Status */}
        <SectionHeader title="Server Connection" />
        <View style={styles.connRow}>
          <View style={[styles.connDot, { backgroundColor: pingColor }]} />
          <Text style={[styles.connText, { color: pingColor }]}>
            {pingStatus === "checking" ? "Checking..." :
             pingStatus === "ok" ? `Server reachable     ${pingInfo}` :
             pingStatus === "error" ? `Not connected     ${pingInfo}` :
             "Not checked"}
          </Text>
        </View>
        <Text style={styles.connUrl}>{getApiBaseUrl()}</Text>
        <View style={{ marginTop: SPACING.sm }}>
          <Button
            title={pingStatus === "checking" ? "Checking..." : "Check Connection"}
            onPress={checkConnection}
            variant="outline"
            loading={pingStatus === "checking"}
            fullWidth
          />
        </View>

        {/* About */}
        <SectionHeader title="About" />
        <InfoRow label="Application" value="RETINOVA Healthcare Platform" />
        <InfoRow label="Version" value="1.0.0" />
        <InfoRow label="Purpose" value="Rural Diabetic Retinopathy Screening & Triage" />

        {/* Advanced (collapsed by default) */}
        <TouchableOpacity
          style={styles.advancedToggle}
          onPress={() => setShowAdvanced((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.advancedToggleText}>
            {showAdvanced ? "▲ Advanced Settings" : "▼ Advanced Settings"}
          </Text>
          <Text style={styles.advancedToggleSub}>Developer / technical configuration</Text>
        </TouchableOpacity>

        {showAdvanced && (
          <View style={styles.advancedBox}>
            <Text style={styles.advancedWarning}>
              These settings are for system administrators and developers. Incorrect values may prevent the app from functioning.
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
            <Text style={styles.advancedHint}>
              Format: http://SERVER_IP:5000{"\n"}
              Configured via EXPO_PUBLIC_API_BASE_URL
            </Text>
            <Button
              title={saving ? "Saving..." : "Save API URL"}
              onPress={saveUrl}
              loading={saving}
              fullWidth
            />
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            RETINOVA supports screening and referral triage. Final clinical diagnosis must be performed by a qualified eye-care professional. This application does not replace a clinical examination.
          </Text>
        </View>

        <View style={{ height: SPACING.xxl }} />
        <Button title="Sign Out" onPress={logout} variant="danger" fullWidth />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl, paddingBottom: 40 },
  title: { fontSize: FONTS.size2XL, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 1, marginBottom: SPACING.xl },
  connRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, paddingVertical: SPACING.sm },
  connDot: { width: 10, height: 10, borderRadius: 5 },
  connText: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightMedium },
  connUrl: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, fontFamily: "monospace", marginBottom: SPACING.sm },
  advancedToggle: { marginTop: SPACING.xl, paddingVertical: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  advancedToggleText: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightBold, color: COLORS.textMuted, letterSpacing: 1 },
  advancedToggleSub: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 2 },
  advancedBox: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginTop: SPACING.sm },
  advancedWarning: { fontSize: FONTS.sizeXS, color: COLORS.warning, marginBottom: SPACING.lg, lineHeight: 17, backgroundColor: COLORS.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm, borderLeftWidth: 3, borderLeftColor: COLORS.warning },
  advancedHint: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, lineHeight: 17, marginBottom: SPACING.md, fontStyle: "italic" },
  disclaimer: { marginTop: SPACING.xl, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border, borderLeftWidth: 3.5, borderLeftColor: COLORS.info },
  disclaimerText: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, lineHeight: 17, textAlign: "center" },
});
