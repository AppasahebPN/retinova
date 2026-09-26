// ============================================================
// RETINOVA — Explainable AI Evidence Screen (ASHA Workflow)
// Figma Make Source of Truth — Polished Healthcare UI System
// ============================================================
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { screeningService } from "../services/screeningService";
import { SectionHeader, InfoRow, Button, RetinovaLogo } from "../components";
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  FONT_FAMILY,
  GRADE_SHORT,
} from "../utils/constants";
import type { Screening, HomeStackParamList, HistoryStackParamList } from "../types";

type Route = RouteProp<HomeStackParamList | HistoryStackParamList, "Evidence">;

// Single evidence image block
function EvidenceImage({
  uri,
  label,
  caption,
  isWarning,
}: {
  uri: string;
  label: string;
  caption: string;
  isWarning?: boolean;
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
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  label: {
    fontSize: 15,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    marginBottom: 4,
    fontFamily: FONT_FAMILY.body,
  },
  labelWarning: { color: COLORS.maroon700 },
  caption: {
    fontSize: 12,
    color: COLORS.slate500,
    marginBottom: SPACING.sm,
    lineHeight: 17,
    fontFamily: FONT_FAMILY.body,
  },
  imgContainer: {
    backgroundColor: "#111111",
    borderRadius: RADIUS.md,
    height: 280,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  img: { width: "100%", height: 280 },
  imgErrorBox: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: "center",
    height: 120,
    justifyContent: "center",
  },
  imgErrorText: {
    fontSize: FONTS.sizeSM,
    color: COLORS.slate500,
    textAlign: "center",
    fontFamily: FONT_FAMILY.body,
  },
  imgErrorUrl: {
    fontSize: 10,
    color: COLORS.slate400,
    fontFamily: FONT_FAMILY.mono,
    marginTop: SPACING.xs,
    textAlign: "center",
  },
});

export default function EvidenceScreen() {
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
        if (active) setError(e.message || "Unable to load evidence.");
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
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else Alert.alert("Report URL", url);
    } catch {
      Alert.alert("Report URL", url);
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.teal800} size="large" />
        <Text style={styles.loadingText}>Loading clinical evidence artifacts...</Text>
      </View>
    );

  if (error || !screening)
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Evidence Unavailable</Text>
        <Text style={styles.errorText}>{error || "Evidence data could not be loaded."}</Text>
      </View>
    );

  const { explainability, segmentation, image, classification, enhancement } = screening;

  const fundusUrl = screeningService.fullImageUrl(image?.storage_url);
  const enhancedUrl = screeningService.fullImageUrl(enhancement?.enhanced_image_url);
  const gcUrl = screeningService.fullImageUrl(explainability?.gradcam_url);
  const vesselUrl = screeningService.fullImageUrl(segmentation?.vessel_mask_url);
  const lesionUrl = screeningService.fullImageUrl(segmentation?.lesion_mask_url);
  const retinalEvidenceUrl = screeningService.fullImageUrl(
    segmentation?.retinal_evidence_url || segmentation?.evidence_overlay_url
  );

  const gradcamLesionIoU = segmentation?.gradcam_lesion_iou ?? segmentation?.gradcamLesionIoU;
  const iouDisplay =
    typeof gradcamLesionIoU === "number"
      ? `${(gradcamLesionIoU * 100).toFixed(1)}%`
      : "Not available";

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.innerContainer}>
        {/* Screen Title */}
        <View style={styles.headerArea}>
          <RetinovaLogo size="sm" />
          <Text style={styles.title}>Explainable Retinal Evidence</Text>
          <Text style={styles.subtitle}>
            AI-assisted visual pathology & saliency attribution for clinical review
          </Text>
          <Text style={styles.screeningId}>Screening ID: {screeningId}</Text>
        </View>

        {/* Notice banner */}
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeTitle}>CLINICAL TRIAGE AID ONLY</Text>
          <Text style={styles.noticeText}>
            The following evidence was generated by the RETINOVA AI pipeline (Swin V2 Tiny +
            segmentation). This evidence supports clinical triage but does NOT constitute a
            confirmed diagnosis. Final assessment by a qualified ophthalmologist is required.
          </Text>
        </View>

        {/* EVIDENCE ARTIFACTS GALLERY */}
        <SectionHeader title="Generated Evidence Artifacts" />

        {/* 1. Composite */}
        {retinalEvidenceUrl ? (
          <EvidenceImage
            uri={retinalEvidenceUrl}
            label="Composite Retinal Evidence Map"
            caption="Multi-layer composite: vessels (cyan), hard exudates (yellow), microaneurysms (red), hemorrhages (magenta), optic disc (green), fovea (blue)."
          />
        ) : null}

        {/* 2. Original */}
        {fundusUrl ? (
          <EvidenceImage
            uri={fundusUrl}
            label="Original Fundus Image"
            caption="Direct optical acquisition before enhancement (Module 1 Input)."
          />
        ) : null}

        {/* 3. Enhanced */}
        {enhancedUrl ? (
          <EvidenceImage
            uri={enhancedUrl}
            label="Enhanced Fundus Image (Module 2)"
            caption="CLAHE green-channel normalized image optimized for vascular and microaneurysm contrast."
          />
        ) : null}

        {/* 4. Grad-CAM */}
        {gcUrl ? (
          <EvidenceImage
            uri={gcUrl}
            label="Grad-CAM Saliency Map (Module 5)"
            caption="Neural network attention attribution highlighting retinal regions that most influenced Swin V2 Tiny classification."
            isWarning={true}
          />
        ) : null}

        {/* 5. Vessels */}
        {vesselUrl ? (
          <EvidenceImage
            uri={vesselUrl}
            label="Vessel Mask & Morphology (Module 3)"
            caption="Segmented retinal vascular caliber and tree structure."
          />
        ) : null}

        {/* 6. Candidate Lesions */}
        {lesionUrl ? (
          <EvidenceImage
            uri={lesionUrl}
            label="Candidate Lesion Proposals (Module 3)"
            caption="Morphological candidate proposals for clinician review (not a confirmed diagnosis)."
            isWarning={true}
          />
        ) : null}

        {/* Neovascularization Assessment Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoHeading}>Neovascularization Assessment</Text>
          <InfoRow label="Dedicated Assessment" value="Not available" />
          <InfoRow
            label="Reason"
            value="No dedicated validated neovascularization detector available."
          />
          <View style={styles.nvNoteBox}>
            <Text style={styles.nvNoteText}>
              Note: Grade 4 classification reflects whole-image neural network features and does
              not substitute for a dedicated pixel-level neovascularization assessment.
            </Text>
          </View>
        </View>

        {/* Spatial Agreement Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoHeading}>Grad-CAM ↔ Lesion Spatial Alignment</Text>
          <InfoRow label="Spatial Agreement (IoU)" value={iouDisplay} />
          <Text style={styles.subtext}>
            IoU evaluated between Swin V2 Grad-CAM saliency activation and Module 3 candidate
            lesion mask. Scale disparity between whole-retina classifier attention (~9%) and
            punctate lesions (&lt;1%) is mathematically expected.
          </Text>
        </View>

        {/* Bottom Actions */}
        <View style={styles.actions}>
          <Button
            title="View Official Clinical Report"
            onPress={openReport}
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
  innerContainer: { maxWidth: 640, width: "100%" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xxxl,
    backgroundColor: COLORS.background,
  },
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
  screeningId: {
    fontSize: 11,
    color: COLORS.slate400,
    fontFamily: FONT_FAMILY.mono,
    marginTop: 4,
  },
  noticeBanner: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderLeftWidth: 3.5,
    borderLeftColor: COLORS.teal800,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  noticeTitle: {
    fontSize: 10,
    fontWeight: FONTS.weightBold,
    color: COLORS.teal800,
    letterSpacing: 0.8,
    marginBottom: 4,
    fontFamily: FONT_FAMILY.body,
  },
  noticeText: {
    fontSize: 12,
    color: COLORS.slate700,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.body,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  infoHeading: {
    fontSize: 13,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    marginBottom: 4,
    fontFamily: FONT_FAMILY.body,
  },
  nvNoteBox: {
    backgroundColor: COLORS.amber50,
    borderWidth: 1,
    borderColor: COLORS.amber100,
    padding: 8,
    borderRadius: RADIUS.sm,
    marginTop: 6,
  },
  nvNoteText: {
    fontSize: 11,
    color: COLORS.amber700,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.body,
  },
  subtext: {
    fontSize: 11,
    color: COLORS.slate500,
    lineHeight: 16,
    marginTop: 6,
    fontFamily: FONT_FAMILY.body,
  },
  actions: { marginTop: SPACING.md },
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
    fontFamily: FONT_FAMILY.display,
  },
  errorText: {
    fontSize: FONTS.sizeMD,
    color: COLORS.slate500,
    textAlign: "center",
    marginTop: 4,
    fontFamily: FONT_FAMILY.body,
  },
});
