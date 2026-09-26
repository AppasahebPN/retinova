import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { screeningService } from "../services/screeningService";
import { Button, SectionHeader, InfoRow, StatusBadge, GradeBadge, RetinovaLogo, RoleBadge } from "../components";
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, FONT_FAMILY, GRADE_LABELS, GRADE_SHORT } from "../utils/constants";
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
      <ActivityIndicator color={COLORS.primary} size="large" />
      <Text style={styles.loadingText}>Loading screening record...</Text>
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
      {/* Header bar */}
      <View style={styles.headerBar}>
        <View style={styles.headerTop}>
          <RetinovaLogo size="sm" />
          <RoleBadge role="ASHA Worker" />
        </View>
        <Text style={styles.title}>Screening File</Text>
        <Text style={styles.screeningId}>ID: {screeningId}</Text>
      </View>

      {decision && (
        <View style={[
          styles.decisionBanner,
          decType === "screen" ? styles.bannerScreen : decType === "refer" ? styles.bannerRefer : styles.bannerRecapture
        ]}>
          <View>
            <Text style={styles.decisionCaption}>AI SCREENING DECISION</Text>
            <Text style={[
              styles.decisionLabel,
              decType === "screen" ? styles.textScreen : decType === "refer" ? styles.textRefer : styles.textRecapture
            ]}>{decision}</Text>
          </View>
          {classification && (
            <GradeBadge grade={classification.predicted_grade} size="large" />
          )}
        </View>
      )}

      {/* Patient info card */}
      <View style={styles.panel}>
        <SectionHeader title="Patient Information" />
        <InfoRow label="Name" value={patient?.name || screening.patient_id} />
        <InfoRow label="Age / Gender" value={patient ? `${patient.age ?? "--"} yrs · ${patient.gender ?? "--"}` : undefined} />
        <InfoRow label="Location" value={patient?.location} />
        <InfoRow label="Phone" value={patient?.phone || "Not recorded"} />
      </View>

      {/* Screening Details card */}
      <View style={styles.panel}>
        <SectionHeader title="Screening Details" />
        <InfoRow label="Date" value={new Date(screening.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
        <InfoRow label="Eye Examined" value={screening.eye ? (screening.eye === "left" ? "OS (Left Eye)" : "OD (Right Eye)") : undefined} />
        <InfoRow label="Status" value={screening.status?.toUpperCase()} />
      </View>

      {/* Fundus Image viewer */}
      {fundusUrl && (
        <View style={styles.panel}>
          <SectionHeader title="Fundus Image" />
          <View style={styles.thumbContainer}>
            <Image source={{ uri: fundusUrl }} style={styles.thumb} resizeMode="contain" accessibilityLabel="Fundus image" />
          </View>
          {image?.original_filename && (
            <Text style={styles.imageCaption}>Source: {image.original_filename}</Text>
          )}
        </View>
      )}

      {/* Classification Result card */}
      <View style={styles.panel}>
        <SectionHeader title="AI Diagnostic Result" />
        {classification ? (
          <>
            <View style={styles.gradeRow}>
              <GradeBadge grade={classification.predicted_grade} size="large" />
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={styles.gradeTitle}>{GRADE_LABELS[classification.predicted_grade] ?? "Not available"}</Text>
                <Text style={styles.gradeDesc}>
                  {classification.referable ? "Referable Diabetic Retinopathy" : "Non-referable condition"}
                </Text>
              </View>
            </View>
            <InfoRow
              label="Calibrated Risk P(G2+)"
              value={classification.g2plus_probability_calibrated !== undefined
                ? `${(classification.g2plus_probability_calibrated * 100).toFixed(1)}%`
                : undefined}
            />
            <InfoRow label="Referral Recommended" value={classification.referable ? "Yes (Priority assessment)" : "No (Routine)"} />
          </>
        ) : (
          <Text style={styles.unavailable}>AI result not available for this screening.</Text>
        )}
      </View>

      {/* Image Quality card */}
      {quality && (
        <View style={styles.panel}>
          <SectionHeader title="Image Quality Gate (IQA)" />
          <InfoRow label="Accepted" value={quality.accepted ? "Yes (Pass)" : "No (Recapture)"} />
          {quality.quality_score !== undefined && (
            <InfoRow label="Quality Score" value={`${quality.quality_score} / 100`} />
          )}
          {!quality.accepted && quality.rejection_reason && (
            <InfoRow label="Rejection Reason" value={quality.rejection_reason} />
          )}
        </View>
      )}

      {/* Referral card */}
      {referral && (
        <View style={styles.panel}>
          <SectionHeader title="Referral Status" />
          <InfoRow label="Status" value={referral.status?.toUpperCase()} />
          <InfoRow label="Priority" value={referral.priority?.toUpperCase()} />
          <InfoRow label="Recommended Action" value={referral.recommended_action} />
          {referral.action_taken && (
            <InfoRow label="Action Taken" value={referral.action_taken.replace(/_/g, " ").toUpperCase()} />
          )}
        </View>
      )}

      {/* Navigation actions */}
      <View style={styles.actions}>
        <Button
          title="VIEW EVIDENCE ARTIFACTS"
          onPress={() => navigation.navigate("Evidence", { screeningId })}
          variant="outline"
          fullWidth
        />
        {decision === "REFER" && (
          <View style={{ marginTop: SPACING.sm }}>
            <Button
              title="VIEW REFERRAL TICKET"
              onPress={() => navigation.navigate("Referral", { screeningId })}
              fullWidth
            />
          </View>
        )}
      </View>

      {/* Clinical Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          RETINOVA supports screening and referral triage. Final clinical diagnosis and management must be performed by a qualified ophthalmologist.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xxxl, backgroundColor: COLORS.background },
  headerBar: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.sm },
  title: { fontSize: 24, fontFamily: FONT_FAMILY.display, color: COLORS.navy900, marginBottom: 2 },
  screeningId: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, fontFamily: FONT_FAMILY.mono },
  decisionBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  bannerScreen: { backgroundColor: COLORS.green50, borderColor: COLORS.green700 },
  bannerRefer: { backgroundColor: COLORS.maroon50, borderColor: COLORS.maroon900 },
  bannerRecapture: { backgroundColor: COLORS.amber50, borderColor: COLORS.amber700 },
  decisionCaption: { fontSize: 9.5, fontWeight: FONTS.weightBold, color: COLORS.textMuted, letterSpacing: 0.8 },
  decisionLabel: { fontSize: FONTS.size2XL, fontWeight: FONTS.weightBold, letterSpacing: 1 },
  textScreen: { color: COLORS.green700 },
  textRefer: { color: COLORS.maroon900 },
  textRecapture: { color: COLORS.amber700 },
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  thumbContainer: {
    backgroundColor: "#000000",
    borderRadius: RADIUS.md,
    height: 220,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.xs,
  },
  thumb: { width: "100%", height: 220 },
  imageCaption: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, textAlign: "center", marginTop: SPACING.xs, fontFamily: FONT_FAMILY.mono },
  gradeRow: { flexDirection: "row", alignItems: "center", marginVertical: SPACING.sm },
  gradeTitle: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.navy900 },
  gradeDesc: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, marginTop: 2 },
  unavailable: { fontSize: FONTS.sizeSM, color: COLORS.textMuted, fontStyle: "italic", marginVertical: SPACING.sm },
  actions: { marginTop: SPACING.sm, marginBottom: SPACING.md },
  disclaimer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3.5,
    borderLeftColor: COLORS.teal800,
  },
  disclaimerText: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, lineHeight: 17, textAlign: "center" },
  loadingText: { marginTop: SPACING.md, fontSize: FONTS.sizeMD, color: COLORS.textSecondary },
  errorText: { fontSize: FONTS.sizeMD, color: COLORS.textSecondary, textAlign: "center" },
});

