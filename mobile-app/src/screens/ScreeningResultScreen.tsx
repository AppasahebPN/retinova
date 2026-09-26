// ============================================================
// RETINOVA — Screening Result Screen (ASHA Field Workflow)
// Figma Make Source of Truth — Polished Healthcare UI System
// ============================================================
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { screeningService } from "../services/screeningService";
import { Button, InfoRow, SectionHeader, StatusBadge } from "../components";
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  FONT_FAMILY,
  GRADE_LABELS,
  GRADE_SHORT,
} from "../utils/constants";
import type { Screening, AshaHomeStackParamList } from "../types";

type Nav = NativeStackNavigationProp<AshaHomeStackParamList, "ScreeningResult">;
type Route = RouteProp<AshaHomeStackParamList, "ScreeningResult">;

// Primary clinical decision banner matching Figma
function DecisionBanner({
  decision,
  grade,
  gradeLabel,
}: {
  decision: string;
  grade?: number;
  gradeLabel?: string;
}) {
  const isRefer = decision === "REFER";
  const isScreen = decision === "SCREEN";
  const isRecapture = decision === "RECAPTURE";

  const cfg = isRefer
    ? {
        bg: COLORS.maroon50,
        border: COLORS.maroon700,
        text: COLORS.maroon700,
        body: "Refer the patient for specialist ophthalmology evaluation.",
      }
    : isScreen
    ? {
        bg: COLORS.green50,
        border: COLORS.green700,
        text: COLORS.green700,
        body: "No referral indicated by this screening result. Routine follow-up.",
      }
    : isRecapture
    ? {
        bg: COLORS.amber50,
        border: COLORS.amber700,
        text: COLORS.amber700,
        body: "Please capture another retinal image for quality clearance.",
      }
    : {
        bg: COLORS.surfaceAlt,
        border: COLORS.border,
        text: COLORS.navy800,
        body: "",
      };

  return (
    <View
      style={[
        bannerStyles.banner,
        { backgroundColor: cfg.bg, borderColor: cfg.border },
      ]}
    >
      {grade !== undefined && gradeLabel && (
        <View style={bannerStyles.gradeRow}>
          <Text style={[bannerStyles.gradeCode, { color: cfg.text }]}>
            {GRADE_SHORT[grade]}
          </Text>
          <Text style={[bannerStyles.gradeLabel, { color: cfg.text }]}>
            {gradeLabel}
          </Text>
        </View>
      )}
      <Text style={[bannerStyles.decision, { color: cfg.text }]}>{decision}</Text>
      {cfg.body ? (
        <Text style={[bannerStyles.body, { color: cfg.text }]}>{cfg.body}</Text>
      ) : null}
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
    ...SHADOWS.card,
  },
  gradeRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  gradeCode: {
    fontSize: 48,
    fontWeight: FONTS.weightBold,
    fontFamily: FONT_FAMILY.display,
    lineHeight: 52,
  },
  gradeLabel: {
    fontSize: FONTS.sizeMD,
    fontWeight: FONTS.weightSemiBold,
    fontFamily: FONT_FAMILY.body,
  },
  decision: {
    fontSize: 28,
    fontWeight: FONTS.weightBold,
    letterSpacing: 2,
    marginBottom: SPACING.xs,
    fontFamily: FONT_FAMILY.display,
  },
  body: {
    fontSize: FONTS.sizeSM,
    textAlign: "center",
    lineHeight: 20,
    fontFamily: FONT_FAMILY.body,
  },
});

export default function ScreeningResultScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { screeningId } = params;
  const [screening, setScreening] = useState<Screening | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setScreening(null);

    screeningService
      .getById(screeningId)
      .then((s) => {
        if (active) setScreening(s);
      })
      .catch((e) => {
        if (active) setError(e.message || "Unable to load screening result.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
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
        <ActivityIndicator color={COLORS.teal800} size="large" />
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
        <View style={{ gap: SPACING.md, width: "100%", maxWidth: 360 }}>
          <Button
            title="TRY AGAIN"
            onPress={() => {
              setLoading(true);
              setError("");
              screeningService
                .getById(screeningId)
                .then(setScreening)
                .catch((e) => setError(e.message))
                .finally(() => setLoading(false));
            }}
            fullWidth
          />
          <Button
            title="RETURN HOME"
            onPress={() => navigation.navigate("Home")}
            variant="secondary"
            fullWidth
          />
        </View>
      </View>
    );
  }

  const { classification, quality, referral } = screening;
  const decision =
    classification?.decision ?? (quality?.accepted === false ? "RECAPTURE" : null);
  const grade = classification?.predicted_grade;
  const gradeLabel = grade !== undefined ? GRADE_LABELS[grade] : undefined;
  const refProb =
    classification?.g2plus_probability_calibrated ??
    classification?.calibrated_confidence;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.innerContainer}>
        {/* Page title */}
        <Text style={styles.title}>Screening Result</Text>
        <Text style={styles.screeningId}>ID: {screeningId}</Text>

        {/* PRIMARY: Decision banner */}
        {decision ? (
          <DecisionBanner
            decision={decision}
            grade={grade}
            gradeLabel={gradeLabel}
          />
        ) : (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingText}>Result not yet available</Text>
          </View>
        )}

        {/* Quality gate failure alert */}
        {!classification && quality?.accepted === false && (
          <View style={styles.qualityAlert}>
            <Text style={styles.qualityAlertTitle}>Image Quality Insufficient</Text>
            <Text style={styles.qualityAlertBody}>
              {quality.rejection_reason ||
                "The retinal image did not meet quality requirements."}
            </Text>
          </View>
        )}

        {/* Referral Risk */}
        {refProb !== undefined && (
          <View style={styles.detailCard}>
            <SectionHeader title="Referral Risk" />
            <View style={styles.riskRow}>
              <Text style={styles.riskLabel}>Referable Risk (P(G2+))</Text>
              <Text style={styles.riskValue}>{(refProb * 100).toFixed(2)}%</Text>
            </View>
            <View style={styles.riskRow}>
              <Text style={styles.riskLabel}>Referable</Text>
              <StatusBadge
                label={
                  classification?.referable === true
                    ? "YES"
                    : classification?.referable === false
                    ? "NO"
                    : "—"
                }
                type={
                  classification?.referable === true
                    ? "refer"
                    : classification?.referable === false
                    ? "screen"
                    : "neutral"
                }
              />
            </View>
          </View>
        )}

        {/* Image Quality */}
        {quality && (
          <View style={styles.detailCard}>
            <SectionHeader title="Image Quality Gate" />
            <InfoRow
              label="Quality Accepted"
              value={quality.accepted ? "Yes — Accepted" : "No — Recapture Required"}
            />
            {!quality.accepted && quality.rejection_reason && (
              <InfoRow label="Reason" value={quality.rejection_reason} />
            )}
          </View>
        )}

        {/* Referral Status */}
        {referral && (
          <View style={styles.detailCard}>
            <SectionHeader title="Referral Status" />
            <InfoRow label="Status" value={referral.status} />
            {referral.recommended_action && (
              <InfoRow
                label="Recommended Action"
                value={referral.recommended_action}
              />
            )}
            {referral.priority && referral.priority !== "none" && (
              <InfoRow label="Priority" value={referral.priority} />
            )}
          </View>
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>Clinical Information</Text>
          <Text style={styles.disclaimerText}>
            RETINOVA provides automated primary screening and referral triage. Final clinical
            diagnosis is performed by a qualified ophthalmologist.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {decision === "REFER" && (
            <View style={{ marginBottom: SPACING.md }}>
              <Button
                title="Create Referral"
                onPress={() => navigation.navigate("Referral", { screeningId })}
                fullWidth
              />
            </View>
          )}
          {decision === "RECAPTURE" && (
            <View style={{ marginBottom: SPACING.md }}>
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
            </View>
          )}
          <Button
            title="View Evidence & Details"
            onPress={() => navigation.navigate("Evidence", { screeningId })}
            variant="secondary"
            fullWidth
          />
          <View style={{ height: SPACING.md }} />
          <Button
            title="View Official Report"
            onPress={openReport}
            variant="secondary"
            fullWidth
          />
          <View style={{ height: SPACING.md }} />
          <Button
            title="Finish & Return Home"
            onPress={() => navigation.navigate("Home")}
            variant="primary"
            fullWidth
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: 50, alignItems: "center" },
  innerContainer: { maxWidth: 560, width: "100%" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xxxl,
    backgroundColor: COLORS.background,
    gap: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    fontFamily: FONT_FAMILY.display,
    marginBottom: 2,
  },
  screeningId: {
    fontSize: 12,
    color: COLORS.slate400,
    fontFamily: FONT_FAMILY.mono,
    marginBottom: SPACING.lg,
  },
  pendingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: "center",
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    ...SHADOWS.card,
  },
  pendingText: {
    fontSize: FONTS.sizeMD,
    color: COLORS.slate500,
    fontFamily: FONT_FAMILY.body,
  },
  qualityAlert: {
    backgroundColor: COLORS.amber50,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.amber100,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    alignItems: "center",
    ...SHADOWS.card,
  },
  qualityAlertTitle: {
    fontSize: FONTS.sizeMD,
    fontWeight: FONTS.weightBold,
    color: COLORS.amber700,
    marginBottom: 4,
    fontFamily: FONT_FAMILY.body,
  },
  qualityAlertBody: {
    fontSize: FONTS.sizeSM,
    color: COLORS.amber700,
    textAlign: "center",
    lineHeight: 18,
    fontFamily: FONT_FAMILY.body,
  },
  detailCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  riskRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  riskLabel: {
    fontSize: FONTS.sizeSM,
    color: COLORS.slate500,
    fontWeight: FONTS.weightMedium,
    flex: 1,
    fontFamily: FONT_FAMILY.body,
  },
  riskValue: {
    fontSize: FONTS.sizeLG,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    fontFamily: FONT_FAMILY.mono,
  },
  disclaimer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderLeftColor: COLORS.teal800,
    borderLeftWidth: 3.5,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  disclaimerTitle: {
    fontSize: FONTS.sizeSM,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    marginBottom: 2,
    fontFamily: FONT_FAMILY.body,
  },
  disclaimerText: {
    fontSize: FONTS.sizeXS,
    color: COLORS.slate500,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.body,
  },
  actions: {},
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizeMD,
    color: COLORS.slate500,
    fontFamily: FONT_FAMILY.body,
  },
  errorTitle: {
    fontSize: FONTS.sizeXL,
    fontWeight: FONTS.weightBold,
    color: COLORS.maroon700,
    textAlign: "center",
    fontFamily: FONT_FAMILY.display,
  },
  errorBody: {
    fontSize: FONTS.sizeMD,
    color: COLORS.slate500,
    textAlign: "center",
    lineHeight: 22,
    fontFamily: FONT_FAMILY.body,
  },
});
