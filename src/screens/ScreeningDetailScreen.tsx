import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { screeningService } from "../services/screeningService";
import { Button, SectionHeader, InfoRow, StatusBadge } from "../components";
import { COLORS, FONTS, SPACING, RADIUS, GRADE_LABELS, GRADE_SHORT } from "../utils/constants";
import type { Screening, HistoryStackParamList } from "../types";

type Nav = NativeStackNavigationProp<HistoryStackParamList, "ScreeningDetail">;
type Route = RouteProp<HistoryStackParamList, "ScreeningDetail">;

export default function ScreeningDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { screeningId } = params;
  const [screening, setScreening] = useState<Screening | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // CRITICAL: Load ONLY the exact screening by its ID
    let active = true;
    screeningService.getById(screeningId)
      .then(s => { if (active) setScreening(s); })
      .catch(e => { if (active) setError(e.message || "Unable to load screening."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [screeningId]);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={COLORS.accent} size="large" />
      <Text style={styles.loadingText}>Loading screening...</Text>
    </View>
  );

  if (error || !screening) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error || "Screening not found."}</Text>
    </View>
  );

  const { classification, quality, referral, image, patient } = screening;
  const fundusUrl = image?.storage_url ? screeningService.fullImageUrl(image.storage_url) : null;
  const decision = classification?.decision ?? (quality?.accepted === false ? "RECAPTURE" : null);
  const decType = decision === "SCREEN" ? "screen" : decision === "REFER" ? "refer" : decision === "RECAPTURE" ? "recapture" : "neutral";

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Screening Details</Text>
      <Text style={styles.screeningId}>ID: {screeningId}</Text>

      {decision && (
        <View style={[styles.decisionBanner, { backgroundColor: decType === "screen" ? COLORS.decisionScreenBg : decType === "refer" ? COLORS.decisionReferBg : COLORS.decisionRecaptureBg, borderColor: decType === "screen" ? COLORS.decisionScreen : decType === "refer" ? COLORS.decisionRefer : COLORS.decisionRecapture }]}>
          <Text style={[styles.decisionLabel, { color: decType === "screen" ? COLORS.decisionScreen : decType === "refer" ? COLORS.decisionRefer : COLORS.decisionRecapture }]}>{decision}</Text>
        </View>
      )}

      <SectionHeader title="Patient" />
      <InfoRow label="Name" value={patient?.name || screening.patient_id} />
      <InfoRow label="Age" value={patient?.age} />
      <InfoRow label="Location" value={patient?.location} />

      <SectionHeader title="Screening Info" />
      <InfoRow label="Date" value={new Date(screening.created_at).toLocaleDateString("en-IN")} />
      <InfoRow label="Eye" value={screening.eye.toUpperCase()} />
      <InfoRow label="Status" value={screening.status} />

      {/* Fundus Image thumbnail */}
      {fundusUrl && (
        <>
          <SectionHeader title="Fundus Image" />
          <View style={styles.thumbContainer}>
            <Image source={{ uri: fundusUrl }} style={styles.thumb} resizeMode="contain" accessibilityLabel="Fundus image" />
          </View>
        </>
      )}

      {/* Classification */}
      {classification ? (
        <>
          <SectionHeader title="Screening Result" />
          <View style={styles.gradeCard}>
            <Text style={styles.gradeShort}>{GRADE_SHORT[classification.predicted_grade] ?? "--"}</Text>
            <Text style={styles.gradeLabel}>{GRADE_LABELS[classification.predicted_grade] ?? "Not available"}</Text>
          </View>
          <InfoRow label="Referable Risk" value={classification.g2plus_probability_calibrated !== undefined ? `${(classification.g2plus_probability_calibrated * 100).toFixed(1)}%` : undefined} />
          <InfoRow label="Referable" value={classification.referable ? "Yes" : "No"} />
        </>
      ) : (
        <>
          <SectionHeader title="Screening Result" />
          <Text style={styles.unavailable}>AI result not available for this screening.</Text>
        </>
      )}

      {/* Image Quality */}
      {quality && (
        <>
          <SectionHeader title="Image Quality" />
          <InfoRow label="Accepted" value={quality.accepted ? "Yes" : "No"} />
          {!quality.accepted && <InfoRow label="Reason" value={quality.rejection_reason} />}
        </>
      )}

      {/* Referral */}
      {referral && (
        <>
          <SectionHeader title="Referral" />
          <InfoRow label="Status" value={referral.status} />
          <InfoRow label="Priority" value={referral.priority} />
          <InfoRow label="Recommended Action" value={referral.recommended_action} />
        </>
      )}

      <View style={styles.actions}>
        <Button title="View Evidence" onPress={() => navigation.navigate("Evidence", { screeningId })} variant="outline" fullWidth />
        <View style={{ height: SPACING.md }} />
        {decision === "REFER" && (
          <Button title="View Referral" onPress={() => navigation.navigate("Referral", { screeningId })} fullWidth />
        )}
      </View>

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
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xxxl, gap: SPACING.md },
  title: { fontSize: FONTS.size2XL, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 1, marginBottom: SPACING.xs },
  screeningId: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, fontFamily: "monospace", marginBottom: SPACING.xl },
  decisionBanner: { borderRadius: RADIUS.lg, borderWidth: 2, padding: SPACING.xl, marginBottom: SPACING.xl, alignItems: "center" },
  decisionLabel: { fontSize: FONTS.size2XL, fontWeight: FONTS.weightBold, letterSpacing: 2 },
  thumbContainer: { backgroundColor: "#0A0A0A", borderRadius: RADIUS.md, height: 200, overflow: "hidden", marginBottom: SPACING.lg, alignItems: "center", justifyContent: "center" },
  thumb: { width: "100%", height: 200 },
  gradeCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.xl, alignItems: "center", marginBottom: SPACING.md },
  gradeShort: { fontSize: 42, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 2 },
  gradeLabel: { fontSize: FONTS.sizeMD, color: COLORS.textSecondary, marginTop: SPACING.xs },
  unavailable: { fontSize: FONTS.sizeSM, color: COLORS.textMuted, fontStyle: "italic", marginBottom: SPACING.xl },
  actions: { marginTop: SPACING.xl },
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

