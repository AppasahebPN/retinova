import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { screeningService } from "../services/screeningService";
import { Button, SectionHeader, InfoRow, RetinovaLogo } from "../components";
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  FONT_FAMILY,
} from "../utils/constants";
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
    screeningService
      .getById(screeningId)
      .then((s) => {
        if (active) {
          setScreening(s);
          if (s.referral?.action_taken) setSelectedAction(s.referral.action_taken);
        }
      })
      .catch((e) => {
        if (active) setError(e.message || "Unable to load referral.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [screeningId]);

  const saveAction = async () => {
    setSaving(true);
    try {
      await screeningService.updateReferral(screeningId, selectedAction);
      setSaved(true);
      Alert.alert("Saved", "Referral action recorded successfully.");
    } catch (e: any) {
      Alert.alert("Error", e.message || "Unable to save referral action.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.teal800} size="large" />
        <Text style={styles.loadingText}>Loading referral...</Text>
      </View>
    );

  if (error || !screening)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Referral information not available."}</Text>
      </View>
    );

  const { referral, classification, patient } = screening;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.innerContainer}>
        <View style={styles.headerArea}>
          <RetinovaLogo size="sm" />
          <Text style={styles.title}>Referral Management</Text>
          <Text style={styles.screeningId}>Screening ID: {screeningId}</Text>
        </View>

        <View style={styles.card}>
          <SectionHeader title="Patient & Screening Summary" />
          <InfoRow label="Patient" value={patient?.name || screening.patient_id} />
          <InfoRow
            label="Screening Date"
            value={new Date(screening.created_at).toLocaleDateString("en-IN")}
          />
          <InfoRow label="Eye" value={screening.eye.toUpperCase()} />
          {classification && (
            <InfoRow
              label="Screening Result"
              value={`${classification.decision} — ${classification.grade_label}`}
            />
          )}
        </View>

        <View style={styles.card}>
          <SectionHeader title="Referral Details" />
          {referral ? (
            <>
              <InfoRow label="Status" value={referral.status} />
              <InfoRow label="Priority" value={referral.priority} />
              <InfoRow label="Reason" value={referral.reason} />
              <InfoRow label="Recommended Action" value={referral.recommended_action} />
            </>
          ) : (
            <Text style={styles.unavailable}>
              No referral record found for this screening.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <SectionHeader title="Update Referral Action" />
          <Text style={styles.actionNote}>Record the field action taken for this patient:</Text>
          <View style={styles.actionList}>
            {ACTION_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.actionOption,
                  selectedAction === opt.key && styles.actionOptionActive,
                ]}
                onPress={() => setSelectedAction(opt.key)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.actionLabel,
                    selectedAction === opt.key && styles.actionLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            title={saving ? "Saving..." : saved ? "Action Saved" : "Save Referral Action"}
            onPress={saveAction}
            loading={saving}
            fullWidth
          />
        </View>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            RETINOVA supports screening and referral triage. Final clinical diagnosis and
            surgical management must be performed by a qualified ophthalmologist.
          </Text>
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
    gap: SPACING.md,
  },
  headerArea: { marginBottom: SPACING.md },
  title: {
    fontSize: 22,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    fontFamily: FONT_FAMILY.display,
    marginTop: 8,
  },
  screeningId: {
    fontSize: 11,
    color: COLORS.slate400,
    fontFamily: FONT_FAMILY.mono,
    marginTop: 2,
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
  unavailable: {
    fontSize: FONTS.sizeSM,
    color: COLORS.slate400,
    fontStyle: "italic",
    marginBottom: SPACING.md,
    fontFamily: FONT_FAMILY.body,
  },
  actionNote: {
    fontSize: FONTS.sizeSM,
    color: COLORS.slate500,
    marginBottom: SPACING.md,
    fontFamily: FONT_FAMILY.body,
  },
  actionList: { gap: SPACING.xs, marginBottom: SPACING.lg },
  actionOption: {
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  actionOptionActive: {
    borderColor: COLORS.teal800,
    backgroundColor: COLORS.teal50,
  },
  actionLabel: {
    fontSize: FONTS.sizeMD,
    color: COLORS.navy700,
    fontFamily: FONT_FAMILY.body,
  },
  actionLabelActive: {
    color: COLORS.teal800,
    fontWeight: FONTS.weightBold,
  },
  disclaimer: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderLeftWidth: 3.5,
    borderLeftColor: COLORS.teal800,
    ...SHADOWS.card,
  },
  disclaimerText: {
    fontSize: FONTS.sizeXS,
    color: COLORS.slate500,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: FONT_FAMILY.body,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizeMD,
    color: COLORS.slate500,
    fontFamily: FONT_FAMILY.body,
  },
  errorText: {
    fontSize: FONTS.sizeMD,
    color: COLORS.maroon700,
    textAlign: "center",
    fontFamily: FONT_FAMILY.body,
  },
});
