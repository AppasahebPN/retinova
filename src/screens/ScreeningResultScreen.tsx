// ============================================================
// RETINOVA — Screening Result Screen (ASHA Field Workflow)
// Clinical result display — hierarchy: Grade → Decision → Risk
// ============================================================
import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, Linking, Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { screeningService } from "../services/screeningService";
import { Button, InfoRow, SectionHeader, StatusBadge } from "../components";
import { COLORS, FONTS, SPACING, RADIUS, GRADE_LABELS, GRADE_SHORT } from "../utils/constants";
import type { Screening, HomeStackParamList } from "../types";

type Nav = NativeStackNavigationProp<HomeStackParamList, "ScreeningResult">;
type Route = RouteProp<HomeStackParamList, "ScreeningResult">;

// The primary clinical decision banner — unmistakably clear
function DecisionBanner({ decision, grade, gradeLabel }: { decision: string; grade?: number; gradeLabel?: string }) {
  const isRefer = decision === "REFER";
  const isScreen = decision === "SCREEN";
  const isRecapture = decision === "RECAPTURE";

  const cfg = isRefer
    ? { bg: COLORS.decisionReferBg, border: COLORS.decisionRefer, text: COLORS.decisionRefer, body: "Refer the patient for ophthalmic evaluation." }
    : isScreen
    ? { bg: COLORS.decisionScreenBg, border: COLORS.decisionScreen, text: COLORS.decisionScreen, body: "No referral indicated by this screening result." }
    : isRecapture
    ? { bg: COLORS.decisionRecaptureBg, border: COLORS.decisionRecapture, text: COLORS.decisionRecapture, body: "Please capture another retinal image." }
    : { bg: COLORS.surfaceAlt, border: COLORS.border, text: COLORS.textPrimary, body: "" };

  return (
    <View style={[bannerStyles.banner, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      {/* Grade shown above decision */}
      {grade !== undefined && gradeLabel && (
        <View style={bannerStyles.gradeRow}>
          <Text style={[bannerStyles.gradeCode, { color: cfg.text }]}>{GRADE_SHORT[grade]}</Text>
          <Text style={[bannerStyles.gradeLabel, { color: cfg.text }]}>{gradeLabel}</Text>
        </View>
      )}
      {/* Main decision */}
      <Text style={[bannerStyles.decision, { color: cfg.text }]}>{decision}</Text>
      {cfg.body ? <Text style={[bannerStyles.body, { color: cfg.text }]}>{cfg.body}</Text> : null}
    </View>
  );
}

const bannerStyles = StyleSheet.create({
  banner: {
    borderRadius: RADIUS.lg,
    borderWidth: 2,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    alignItems: "center",
  },
  gradeRow: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm, marginBottom: SPACING.sm },
  gradeCode: { fontSize: 48, fontWeight: FONTS.weightBold, lineHeight: 52 },
  gradeLabel: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightSemiBold },
  decision: { fontSize: FONTS.size3XL, fontWeight: FONTS.weightBold, letterSpacing: 3, marginBottom: SPACING.xs },
  body: { fontSize: FONTS.sizeMD, textAlign: "center", lineHeight: 22 },
});

export default function ScreeningResultScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { screeningId } = params; // EXACT screening ID — never "latest"
  const [screening, setScreening] = useState<Screening | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setScreening(null); // Clear any previous state before fetching

    screeningService
      .getById(screeningId)
      .then((s) => { if (active) setScreening(s); })
      .catch((e) => { if (active) setError(e.message || "Unable to load screening result."); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [screeningId]);

  const openReport = async () => {
    const url = screeningService.reportHtmlUrl(screeningId);
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Cannot Open Report", `Open this URL in a browser:\n${url}`);
      }
    } catch {
      Alert.alert("Cannot Open Report", `Open this URL in a browser:\n${url}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.accent} size="large" />
        <Text style={styles.loadingText}>Loading screening result...</Text>
      </View>
    );
  }

  if (error || !screening) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Unable to Load Result</Text>
        <Text style={styles.errorBody}>
          {error || "Screening result not found. Please try again."}
        </Text>
        <View style={{ gap: SPACING.md, width: "100%" }}>
          <Button
            title="TRY AGAIN"
            onPress={() => {
              setLoading(true);
              setError("");
              screeningService.getById(screeningId)
                .then(setScreening)
                .catch(e => setError(e.message))
                .finally(() => setLoading(false));
            }}
            fullWidth
          />
          <Button title="RETURN HOME" onPress={() => navigation.navigate("Home")} variant="outline" fullWidth />
        </View>
      </View>
    );
  }

  const { classification, quality, referral } = screening;

  // Decision comes from backend only — never calculated in UI
  const decision = classification?.decision ?? (quality?.accepted === false ? "RECAPTURE" : null);
  const grade = classification?.predicted_grade;
  const gradeLabel = grade !== undefined ? GRADE_LABELS[grade] : undefined;
  const refProb = classification?.g2plus_probability_calibrated ?? classification?.calibrated_confidence;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Page title */}
      <Text style={styles.title}>Screening Result</Text>
      <Text style={styles.screeningId}>ID: {screeningId}</Text>

      {/* PRIMARY: Decision banner with grade inside */}
      {decision ? (
        <DecisionBanner decision={decision} grade={grade} gradeLabel={gradeLabel} />
      ) : (
        // No classification yet
        <View style={styles.pendingCard}>
          <Text style={styles.pendingText}>Result not yet available</Text>
        </View>
      )}

      {/* Quality gate failure without classification */}
      {!classification && quality?.accepted === false && (
        <View style={styles.qualityAlert}>
          <Text style={styles.qualityAlertTitle}>Image Quality Insufficient</Text>
          <Text style={styles.qualityAlertBody}>
            {quality.rejection_reason || "The retinal image did not meet quality requirements."}
          </Text>
        </View>
      )}

      {/* Referral Risk */}
      {refProb !== undefined && (
        <>
          <SectionHeader title="Referral Risk" />
          <View style={styles.riskRow}>
            <Text style={styles.riskLabel}>Referable Risk (P(G2+))</Text>
            <Text style={styles.riskValue}>{(refProb * 100).toFixed(2)}%</Text>
          </View>
          <View style={styles.riskRow}>
            <Text style={styles.riskLabel}>Referable</Text>
            <StatusBadge
              label={classification?.referable === true ? "YES" : classification?.referable === false ? "NO" : "—"}
              type={classification?.referable === true ? "refer" : classification?.referable === false ? "screen" : "neutral"}
            />
          </View>
        </>
      )}

      {/* Image Quality */}
      {quality && (
        <>
          <SectionHeader title="Image Quality" />
          <InfoRow label="Quality Accepted" value={quality.accepted ? "Yes — Accepted" : "No — Recapture Required"} />
          {!quality.accepted && quality.rejection_reason && (
            <InfoRow label="Reason" value={quality.rejection_reason} />
          )}
        </>
      )}

      {/* Referral Status */}
      {referral && (
        <>
          <SectionHeader title="Referral Status" />
          <InfoRow label="Status" value={referral.status} />
          {referral.recommended_action && (
            <InfoRow label="Recommended Action" value={referral.recommended_action} />
          )}
          {referral.priority && referral.priority !== "none" && (
            <InfoRow label="Priority" value={referral.priority} />
          )}
        </>
      )}

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerTitle}>Important</Text>
        <Text style={styles.disclaimerText}>
          RETINOVA supports screening and referral triage. Final clinical diagnosis must be performed by a qualified ophthalmologist.
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {decision === "REFER" && (
          <>
            <Button
              title="Create Referral"
              onPress={() => navigation.navigate("Referral", { screeningId })}
              fullWidth
            />
            <View style={{ height: SPACING.md }} />
          </>
        )}
        {decision === "RECAPTURE" && (
          <>
            <Button
              title="Capture Again"
              onPress={() =>
                navigation.navigate("ImageCapture", {
                  patientId: screening.patient_id,
                  patientName: screening.patient?.name || screening.patient_id,
                  eye: screening.eye as "left" | "right",
                })
              }
              fullWidth
            />
            <View style={{ height: SPACING.md }} />
          </>
        )}
        <Button
          title="View Evidence & Details"
          onPress={() => navigation.navigate("Evidence", { screeningId })}
          variant="outline"
          fullWidth
        />
        <View style={{ height: SPACING.md }} />
        <Button
          title="View Official Report"
          onPress={openReport}
          variant="outline"
          fullWidth
        />
        <View style={{ height: SPACING.md }} />
        <Button
          title="Finish & Return Home"
          onPress={() => navigation.navigate("Home")}
          variant="secondary"
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xxxl, backgroundColor: COLORS.background, gap: SPACING.lg },

  title: { fontSize: FONTS.size2XL, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 1, marginBottom: SPACING.xs },
  screeningId: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, fontFamily: "monospace", marginBottom: SPACING.lg },

  pendingCard: { backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.lg, padding: SPACING.xl, alignItems: "center", marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.border },
  pendingText: { fontSize: FONTS.sizeMD, color: COLORS.textMuted },

  qualityAlert: {
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.decisionRecapture,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    alignItems: "center",
  },
  qualityAlertTitle: { fontSize: FONTS.sizeLG, fontWeight: FONTS.weightBold, color: COLORS.decisionRecapture, letterSpacing: 1, marginBottom: SPACING.xs },
  qualityAlertBody: { fontSize: FONTS.sizeSM, color: COLORS.warning, textAlign: "center", lineHeight: 20 },

  riskRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  riskLabel: { fontSize: FONTS.sizeSM, color: COLORS.textMuted, fontWeight: FONTS.weightMedium, flex: 1 },
  riskValue: { fontSize: FONTS.sizeLG, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },

  disclaimer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftColor: COLORS.info,
    borderLeftWidth: 3.5,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  disclaimerTitle: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  disclaimerText: { fontSize: FONTS.sizeSM, color: COLORS.textSecondary, lineHeight: 20 },

  actions: {},
  loadingText: { marginTop: SPACING.md, fontSize: FONTS.sizeMD, color: COLORS.textSecondary },
  errorTitle: { fontSize: FONTS.sizeXL, fontWeight: FONTS.weightBold, color: COLORS.error, textAlign: "center" },
  errorBody: { fontSize: FONTS.sizeMD, color: COLORS.textSecondary, textAlign: "center", lineHeight: 22 },
});
