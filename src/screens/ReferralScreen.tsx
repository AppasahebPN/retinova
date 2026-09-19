import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { screeningService } from "../services/screeningService";
import { Button, SectionHeader, InfoRow } from "../components";
import { COLORS, FONTS, SPACING, RADIUS } from "../utils/constants";
import type { Screening, HomeStackParamList, HistoryStackParamList } from "../types";

type Route = RouteProp<HomeStackParamList | HistoryStackParamList, "Referral">;

const ACTION_OPTIONS = [
  { key: "referral_pending", label: "Referral Pending" },
  { key: "patient_advised", label: "Patient Advised" },
  { key: "referral_given", label: "Referral Given" },
  { key: "referred_to_hospital", label: "Referred to Hospital" },
  { key: "patient_declined", label: "Patient Declined Referral" },
  { key: "follow_up_scheduled", label: "Follow-up Scheduled" },
];

export default function ReferralScreen() {
  const { params } = useRoute<Route>();
  const { screeningId } = params;
  const [screening, setScreening] = useState<Screening | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedAction, setSelectedAction] = useState("referral_pending");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    screeningService.getById(screeningId)
      .then(s => {
        if (active) {
          setScreening(s);
          if (s.referral?.action_taken) setSelectedAction(s.referral.action_taken);
        }
      })
      .catch(e => { if (active) setError(e.message || "Unable to load referral."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [screeningId]);

  const saveAction = async () => {
    setSaving(true);
    try {
      await screeningService.updateReferral(screeningId, selectedAction);
      setSaved(true);
      Alert.alert("Saved", "Referral action recorded successfully.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Unable to save referral action.");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={COLORS.accent} size="large" />
      <Text style={styles.loadingText}>Loading referral...</Text>
    </View>
  );

  if (error || !screening) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error || "Referral information not available."}</Text>
    </View>
  );

  const { referral, classification, patient } = screening;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Referral Details</Text>
      <Text style={styles.screeningId}>Screening ID: {screeningId}</Text>

      <SectionHeader title="Patient & Screening" />
      <InfoRow label="Patient" value={patient?.name || screening.patient_id} />
      <InfoRow label="Screening Date" value={new Date(screening.created_at).toLocaleDateString("en-IN")} />
      <InfoRow label="Eye" value={screening.eye.toUpperCase()} />
      {classification && <InfoRow label="Screening Result" value={`${classification.decision} - ${classification.grade_label}`} />}

      <SectionHeader title="Referral Details" />
      {referral ? (
        <>
          <InfoRow label="Status" value={referral.status} />
          <InfoRow label="Priority" value={referral.priority} />
          <InfoRow label="Reason" value={referral.reason} />
          <InfoRow label="Recommended Action" value={referral.recommended_action} />
        </>
      ) : (
        <Text style={styles.unavailable}>No referral record found for this screening.</Text>
      )}

      <SectionHeader title="Update Referral Action" />
      <Text style={styles.actionNote}>Record the action taken for this referral:</Text>
      <View style={styles.actionList}>
        {ACTION_OPTIONS.map(opt => (
          <View
            key={opt.key}
            style={[styles.actionOption, selectedAction === opt.key && styles.actionOptionActive]}
          >
            <Text
              style={[styles.actionLabel, selectedAction === opt.key && styles.actionLabelActive]}
              onPress={() => setSelectedAction(opt.key)}
            >
              {opt.label}
            </Text>
          </View>
        ))}
      </View>

      <Button
        title={saving ? "Saving..." : saved ? "Saved" : "Save Referral Action"}
        onPress={saveAction}
        loading={saving}
        fullWidth
      />

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          RETINOVA supports screening and referral. Final clinical diagnosis must be performed by a qualified eye-care professional.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xxxl, backgroundColor: COLORS.background, gap: SPACING.md },
  title: { fontSize: FONTS.size2XL, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 1, marginBottom: SPACING.xs },
  screeningId: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, fontFamily: "monospace", marginBottom: SPACING.xl },
  unavailable: { fontSize: FONTS.sizeSM, color: COLORS.textMuted, fontStyle: "italic", marginBottom: SPACING.xl },
  actionNote: { fontSize: FONTS.sizeSM, color: COLORS.textSecondary, marginBottom: SPACING.md },
  actionList: { gap: SPACING.sm, marginBottom: SPACING.xl },
  actionOption: { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, backgroundColor: COLORS.surface },
  actionOptionActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentLight },
  actionLabel: { fontSize: FONTS.sizeMD, color: COLORS.textSecondary },
  actionLabelActive: { color: COLORS.accent, fontWeight: FONTS.weightSemiBold },
  disclaimer: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3.5,
    borderLeftColor: COLORS.info,
  },
  disclaimerText: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, lineHeight: 17, textAlign: "center" },
  loadingText: { marginTop: SPACING.md, fontSize: FONTS.sizeMD, color: COLORS.textSecondary },
  errorText: { fontSize: FONTS.sizeMD, color: COLORS.textSecondary, textAlign: "center" },
});

