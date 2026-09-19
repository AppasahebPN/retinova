// ============================================================
// RETINOVA — Explainable AI Evidence Screen (ASHA Workflow)
// "Why did RETINOVA flag this image?" — clinical evidence review
// ============================================================
import React, { useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Image,
  ActivityIndicator, TouchableOpacity, Linking, Alert,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { screeningService } from "../services/screeningService";
import { SectionHeader, InfoRow, Button } from "../components";
import { COLORS, FONTS, SPACING, RADIUS } from "../utils/constants";
import type { Screening, HomeStackParamList, HistoryStackParamList } from "../types";

type Route = RouteProp<HomeStackParamList | HistoryStackParamList, "Evidence">;

// Single evidence image block
function EvidenceImage({ uri, label, caption, isWarning }: {
  uri: string; label: string; caption: string; isWarning?: boolean;
}) {
  const [imgError, setImgError] = useState(false);
  return (
    <View style={evStyles.block}>
      <Text style={[evStyles.label, isWarning && evStyles.labelWarning]}>{label}</Text>
      <Text style={evStyles.caption}>{caption}</Text>
      {imgError ? (
        <View style={evStyles.imgErrorBox}>
          <Text style={evStyles.imgErrorText}>Image could not be loaded from server.</Text>
          <Text style={evStyles.imgErrorUrl}>{uri}</Text>
        </View>
      ) : (
        <View style={evStyles.imgContainer}>
          <Image
            source={{ uri }}
            style={evStyles.img}
            resizeMode="contain"
            accessibilityLabel={label}
            onError={() => setImgError(true)}
          />
        </View>
      )}
    </View>
  );
}

const evStyles = StyleSheet.create({
  block: {
    marginBottom: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  label: {
    fontSize: FONTS.sizeMD,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  labelWarning: { color: COLORS.decisionRefer },
  caption: { fontSize: FONTS.sizeSM, color: COLORS.textSecondary, marginBottom: SPACING.sm, lineHeight: 19 },
  imgContainer: {
    backgroundColor: "#0A0A0A",
    borderRadius: RADIUS.sm,
    height: 260,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  img: { width: "100%", height: 260 },
  imgErrorBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.sm,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    height: 120,
    justifyContent: 'center',
  },
  imgErrorText: { fontSize: FONTS.sizeSM, color: COLORS.textMuted, textAlign: "center" },
  imgErrorUrl: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, fontFamily: "monospace", marginTop: SPACING.xs, textAlign: "center" },
});

export default function EvidenceScreen() {
  const { params } = useRoute<Route>();
  const { screeningId } = params; // Always exact ID
  const [screening, setScreening] = useState<Screening | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setScreening(null); // Clear before loading
    screeningService
      .getById(screeningId)
      .then((s) => { if (active) setScreening(s); })
      .catch((e) => { if (active) setError(e.message || "Unable to load evidence."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [screeningId]);

  const openReport = async () => {
    const url = screeningService.reportHtmlUrl(screeningId);
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else Alert.alert("Report URL", url);
    } catch {
      Alert.alert("Report URL", url);
    }
  };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={COLORS.accent} size="large" />
      <Text style={styles.loadingText}>Loading evidence...</Text>
    </View>
  );

  if (error || !screening) return (
    <View style={styles.center}>
      <Text style={styles.errorTitle}>Evidence Unavailable</Text>
      <Text style={styles.errorText}>{error || "Evidence data could not be loaded."}</Text>
    </View>
  );

  const { explainability, segmentation, image, classification } = screening;

  // All URLs from backend data — never hardcoded
  const fundusUrl = screeningService.fullImageUrl(image?.storage_url);
  const gcUrl = screeningService.fullImageUrl(explainability?.gradcam_url);
  const vesselUrl = screeningService.fullImageUrl(segmentation?.vessel_mask_url);
  const lesionUrl = screeningService.fullImageUrl(segmentation?.lesion_mask_url);
  const retinalEvidenceUrl = screeningService.fullImageUrl(segmentation?.retinal_evidence_url || segmentation?.evidence_overlay_url);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Screen Title */}
      <View style={styles.brandRow}>
        <Text style={styles.appName}>RETINOVA</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>Clinical Evidence</Text>
        </View>
      </View>
      <Text style={styles.title}>Explainable Retinal Evidence</Text>
      <Text style={styles.subtitle}>AI-assisted visual pathology & saliency attribution for clinical review</Text>
      <Text style={styles.screeningId}>Screening ID: {screeningId}</Text>

      {/* Notice banner */}
      <View style={styles.noticeBanner}>
        <Text style={styles.noticeTitle}>Clinical Triage Aid Only</Text>
        <Text style={styles.noticeText}>
          The following evidence was generated by the RETINOVA AI pipeline (Swin V2 Tiny + segmentation). This evidence supports clinical triage but does NOT constitute a confirmed diagnosis. Final assessment by a qualified ophthalmologist is required.
        </Text>
      </View>

      {/* 1. Original Fundus Image */}
      <SectionHeader title="Original Fundus Image" />
      <EvidenceImage
        uri={fundusUrl}
        label="Captured Retinal Image"
        caption="Original retinal fundus image acquired by health worker."
      />
      {screening.eye && (
        <InfoRow label="Eye Imaged" value={screening.eye.toUpperCase() === "LEFT" ? "Left Eye (OS)" : "Right Eye (OD)"} />
      )}

      {/* 2. Model Attribution (Grad-CAM) */}
      <SectionHeader title="Grad-CAM Activation Map" />
      {gcUrl ? (
        <>
          <EvidenceImage
            uri={gcUrl}
            label="Grad-CAM Class Activation Map"
            caption="Highlights retinal regions that contributed most strongly to the classification decision."
          />
          {explainability?.featureLayer ? (
            <InfoRow label="Feature Layer" value={explainability.featureLayer} />
          ) : null}
          {explainability?.evidence_summary ? (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryLabel}>Attribution Focus:</Text>
              <Text style={styles.summaryText}>{explainability.evidence_summary}</Text>
            </View>
          ) : null}
        </>
      ) : (
        <Text style={styles.unavailable}>Grad-CAM activation map not available for this screening.</Text>
      )}

      {/* 3. Vessel Evidence */}
      {vesselUrl ? (
        <>
          <SectionHeader title="Retinal Vessel Evidence" />
          <EvidenceImage
            uri={vesselUrl}
            label="Retinal Vessel Segmentation"
            caption="Morphological vessel structure and caliber segmentation output."
          />
          {segmentation?.vessel_coverage !== undefined && (
            <InfoRow label="Vessel Coverage" value={`${(segmentation.vessel_coverage * 100).toFixed(1)}%`} />
          )}
          {segmentation?.vessel_metrics?.branchingComplexity !== undefined && (
            <InfoRow label="Vascular Junctions" value={`${segmentation.vessel_metrics.junctionClusters ?? segmentation.vessel_metrics.branchingComplexity} native-scale pruned junction clusters`} />
          )}
          {segmentation?.vessel_metrics?.meanCaliber !== undefined && (
            <InfoRow label="Mean Caliber" value={`${segmentation.vessel_metrics.meanCaliber} px`} />
          )}
        </>
      ) : null}

      {/* 4. Candidate Lesion Evidence */}
      {lesionUrl ? (
        <>
          <SectionHeader title="Candidate Lesion Evidence" />
          <EvidenceImage
            uri={lesionUrl}
            label="Candidate Lesion Evidence"
            caption="Computer vision candidate lesion proposals — labeled strictly as candidate detections, NOT confirmed clinical lesions."
            isWarning
          />
          <View style={styles.lesionNotice}>
            <Text style={styles.lesionNoticeTitle}>Candidate Regions Only</Text>
            <Text style={styles.lesionNoticeText}>
              Candidate lesion evidence generated by morphological analysis for clinician review. These regions are not independent diagnostic proof. Final clinical determination must be made by a qualified ophthalmologist.
            </Text>
          </View>
          {segmentation?.candidate_count !== undefined && (
            <InfoRow label="Total Candidate Count" value={String(segmentation.candidate_count)} />
          )}
          {segmentation?.bright_lesion_count !== undefined && (
            <InfoRow label="Bright Candidates (EX / SE)" value={String(segmentation.bright_lesion_count)} />
          )}
          {segmentation?.dark_lesion_count !== undefined && (
            <InfoRow label="Dark Candidates (MA / HE)" value={String(segmentation.dark_lesion_count)} />
          )}
        </>
      ) : null}

      {/* 5. Combined Retinal Evidence Map */}
      {retinalEvidenceUrl ? (
        <>
          <SectionHeader title="Retinal Abnormality Map" />
          <EvidenceImage
            uri={retinalEvidenceUrl}
            label="Composite Retinal Evidence"
            caption="Multi-layer composite synthesizing vessels, candidate lesions, and anatomical landmarks."
          />
        </>
      ) : null}

      {/* 6. Neovascularization Assessment */}
      <SectionHeader title="Neovascularization Assessment" />
      <InfoRow label="Dedicated Assessment" value="Not available" />
      <InfoRow label="Reason" value="No dedicated validated neovascularization detector available." />
      <View style={styles.nvNoticeBox}>
        <Text style={styles.nvNoticeText}>
          Important: Grade 4 classification reflects whole-image neural-network features and does not substitute for a dedicated pixel-level neovascularization assessment.
        </Text>
      </View>

      {/* 5. Classification Details */}
      {classification && (
        <>
          <SectionHeader title="Classification Details" />
          <InfoRow label="AI Model" value={classification.model_name || "Swin V2 Tiny"} />
          <InfoRow label="Model Version" value={classification.model_version} />
          <InfoRow label="Confidence Method" value={classification.confidence_method} />
          <InfoRow
            label="Processing Time"
            value={classification.processing_time_ms !== undefined ? `${classification.processing_time_ms} ms` : undefined}
          />
        </>
      )}

      {/* Report */}
      <SectionHeader title="Screening Report" />
      <Button title="View Official Clinical Report" onPress={openReport} variant="outline" fullWidth />
      <Text style={styles.reportNote}>
        Opens the clinical screening report in your browser.
      </Text>

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

  brandRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 3 },
  appName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 2 },
  roleBadge: { backgroundColor: COLORS.accentLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.accent },
  roleBadgeText: { fontSize: 9.5, fontWeight: FONTS.weightBold, color: COLORS.accent },
  title: { fontSize: FONTS.sizeXL, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 0.3, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONTS.sizeSM, color: COLORS.textMuted, marginBottom: 4 },
  screeningId: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, fontFamily: "monospace", marginBottom: SPACING.lg },

  noticeBanner: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.info,
  },
  noticeTitle: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightBold, color: COLORS.info, marginBottom: 4 },
  noticeText: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, lineHeight: 17 },

  unavailable: { fontSize: FONTS.sizeSM, color: COLORS.textMuted, fontStyle: "italic", marginBottom: SPACING.xl },
  summaryBox: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryLabel: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.accent, marginBottom: 4, letterSpacing: 0.5 },
  summaryText: { fontSize: FONTS.sizeSM, color: COLORS.textSecondary, lineHeight: 20 },

  lesionNotice: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  lesionNoticeTitle: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightBold, color: COLORS.warning, marginBottom: 4 },
  lesionNoticeText: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, lineHeight: 17 },

  reportNote: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: SPACING.sm, marginBottom: SPACING.xl, fontStyle: "italic", textAlign: "center" },
  nvNoticeBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
    borderLeftWidth: 3.5,
    borderLeftColor: COLORS.warning,
  },
  nvNoticeText: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, lineHeight: 18 },
  disclaimer: {
    marginTop: SPACING.xs,
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
  errorTitle: { fontSize: FONTS.sizeXL, fontWeight: FONTS.weightBold, color: COLORS.error, textAlign: "center" },
  errorText: { fontSize: FONTS.sizeMD, color: COLORS.textSecondary, textAlign: "center" },
});
