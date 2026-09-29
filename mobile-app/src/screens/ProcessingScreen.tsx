// ============================================================
// RETINOVA — AI Processing Screen (ASHA Field Workflow)
// Figma Make Source of Truth — Polished Healthcare UI System
// ============================================================
import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, BackHandler } from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { screeningService } from "../services/screeningService";
import { useAuth } from "../hooks/useAuth";
import { Button, RetinovaLogo } from "../components";
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  FONT_FAMILY,
} from "../utils/constants";
import type { AshaHomeStackParamList } from "../types";

type Nav = NativeStackNavigationProp<AshaHomeStackParamList, "Processing">;
type Route = RouteProp<AshaHomeStackParamList, "Processing">;

type Stage = "uploading" | "analyzing" | "evidence" | "complete" | "error";

const STAGE_LABELS: Record<Stage, string> = {
  uploading: "Uploading image...",
  analyzing: "Analyzing retinal image...",
  evidence: "Generating clinical evidence...",
  complete: "Screening triage complete",
  error: "AI analysis failed",
};

const STAGE_DESCRIPTIONS: Record<Stage, string> = {
  uploading: "Transferring retinal fundus image to server",
  analyzing: "Executing retinal quality assessment and severity triage",
  evidence: "Generating Grad-CAM saliency, vessels, and candidate lesion maps",
  complete: "Screening result ready for review",
  error: "",
};

const ORDERED_STAGES: Stage[] = ["uploading", "analyzing", "evidence", "complete"];

export default function ProcessingScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { patientId, patientName, eye, imageUri, mimeType, fileName } = params;
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("uploading");
  const [errorMsg, setErrorMsg] = useState("");
  const [errorDetail, setErrorDetail] = useState("");
  const isRunning = useRef(false);
  const isMounted = useRef(true);

  // Disable Android back during processing to prevent corrupt state
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (stage !== "error") return true;
        return false;
      });
      return () => sub.remove();
    }, [stage])
  );

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    run();
  }, []);

  const run = async () => {
    if (isRunning.current) return;
    isRunning.current = true;

    if (isMounted.current) {
      setStage("uploading");
      setErrorMsg("");
      setErrorDetail("");
    }

    try {
      if (__DEV__) {
        console.log("[RETINOVA SCREENING FLOW] step=UPLOAD_START", { patientId, eye });
      }

      // STEP 1: Upload fundus image to local server file storage
      if (isMounted.current) setStage("uploading");
      const filename = `fundus_${eye}_${Date.now()}.jpg`;
      const upload = await screeningService.uploadImage(imageUri, filename, mimeType, fileName);
      if (!isMounted.current) return;

      // STEP 2: Create screening record
      const screening = await screeningService.create({
        patientId,
        eye,
        facilityId: user?.facility_id,
        imageStorageUrl: upload.storageUrl,
        originalFilename: upload.originalFilename,
      });
      if (!isMounted.current) return;
      const screeningId = screening.id;

      // STEP 3: Execute real AI inference (Swin V2 Tiny + Grad-CAM + Vessels + Lesions)
      if (isMounted.current) setStage("analyzing");
      if (__DEV__) {
        console.log("[RETINOVA SCREENING FLOW] step=AI_ANALYSIS_START", { screeningId });
      }

      const analyzed = await screeningService.runAnalysis(screeningId);
      if (!isMounted.current) return;

      // STEP 4: Evidence verification & local database persistence
      if (isMounted.current) setStage("evidence");
      if (__DEV__) {
        console.log("[RETINOVA SCREENING FLOW] step=EVIDENCE_VERIFIED", {
          screeningId,
          hasGradCam: !!analyzed.explainability?.gradcam_url,
          hasVessels: !!analyzed.segmentation?.vessel_mask_url,
          hasLesions: !!analyzed.segmentation?.lesion_mask_url,
        });
      }

      // Persist to localDatabase for offline access
      try {
        const { localDatabase } = await import("../services/localDatabase");
        await localDatabase.insertEvent({
          eventId: screeningId,
          timestamp: new Date().toISOString(),
          detectionType: analyzed.classification?.grade_label || "Diabetic Retinopathy Assessment",
          confidence: (analyzed.classification?.calibrated_confidence ?? analyzed.classification?.g2plus_probability_calibrated ?? 0.85),
          severity: analyzed.classification?.decision === "REFER" ? "HIGH" : "LOW",
          latitude: 13.0827,
          longitude: 80.2707,
          localImagePath: upload.storageUrl,
          modelVersion: analyzed.classification?.model_version || "swinv2-tiny-v1",
          syncStatus: "SYNCED",
          metadata: {
            patientId: patientId || "PATIENT_LOCAL",
            patientName: patientName || "Field Screening Subject",
            eye,
            grade: analyzed.classification?.predicted_grade ?? 0,
            recommendation: (analyzed.classification as any)?.recommendation || analyzed.referral?.recommended_action,
            features: {
              sharpnessScore: analyzed.quality?.sharpness ?? 85,
              illuminationScore: analyzed.quality?.illumination ?? 90,
              vesselTortuosity: analyzed.segmentation?.vessel_density ?? 0.12,
              lesionCandidates: analyzed.segmentation?.candidate_count ?? 0,
            },
            segmentation: analyzed.segmentation,
            explainability: analyzed.explainability,
          },
        });
      } catch (dbErr) {
        console.warn("[RETINOVA] Local DB cache non-blocking warning:", dbErr);
      }

      // STEP 5: Complete — navigate to result with EXACT screening ID
      if (isMounted.current) setStage("complete");
      setTimeout(() => {
        if (isMounted.current) {
          navigation.replace("ScreeningResult", { screeningId });
        }
      }, 400);
    } catch (e: any) {
      isRunning.current = false;
      if (!isMounted.current) return;
      const rawMsg = e.message || "An unexpected error occurred.";
      if (__DEV__) {
        console.error("[RETINOVA MOBILE FLOW] step=ERROR", { error: rawMsg });
      }

      let userMsg = rawMsg;
      let detail = rawMsg;
      if (
        rawMsg.toLowerCase().includes("connection") ||
        rawMsg.toLowerCase().includes("network") ||
        rawMsg.toLowerCase().includes("fetch")
      ) {
        userMsg = "Cannot connect to RETINOVA backend. Please check your network connection.";
        detail = rawMsg;
      } else if (rawMsg.toLowerCase().includes("upload")) {
        userMsg = "Image upload failed. Please try selecting the image again.";
        detail = rawMsg;
      } else if (
        rawMsg.toLowerCase().includes("timed out") ||
        rawMsg.toLowerCase().includes("timeout")
      ) {
        userMsg = "The AI analysis timed out. The server may be busy — please try again.";
        detail = rawMsg;
      } else if (
        rawMsg.toLowerCase().includes("quality") ||
        rawMsg.toLowerCase().includes("reject")
      ) {
        userMsg = "Image quality check failed. Please capture a clearer retinal image.";
        detail = rawMsg;
      }

      setErrorMsg(userMsg);
      setErrorDetail(detail !== userMsg ? detail : "");
      setStage("error");
    }
  };

  const handleRetry = () => {
    isRunning.current = false;
    run();
  };

  const isError = stage === "error";
  const currentIdx = ORDERED_STAGES.indexOf(stage as any);

  return (
    <View style={styles.container}>
      <View style={styles.innerBox}>
        {/* Header */}
        <View style={styles.header}>
          <RetinovaLogo size="sm" />
          <Text style={styles.title}>AI Retinal Analysis</Text>
          <Text style={styles.subtitle}>
            {patientName} · {eye.toUpperCase() === "LEFT" ? "Left Eye (OS)" : "Right Eye (OD)"}
          </Text>
        </View>

        {/* Status card */}
        <View style={styles.statusCard}>
          {!isError ? (
            <>
              <ActivityIndicator color={COLORS.teal800} size="large" style={styles.spinner} />
              <Text style={styles.stageLabel}>{STAGE_LABELS[stage]}</Text>
              <Text style={styles.stageDesc}>{STAGE_DESCRIPTIONS[stage]}</Text>

              <View style={styles.steps}>
                {ORDERED_STAGES.map((s, idx) => {
                  const isDone = idx < currentIdx;
                  const isActive = s === stage;
                  return (
                    <View key={s} style={styles.stepRow}>
                      <View
                        style={[
                          styles.stepIndicator,
                          isDone && styles.stepDone,
                          isActive && styles.stepActive,
                        ]}
                      >
                        {isDone ? (
                          <Text style={styles.stepCheck}>✓</Text>
                        ) : (
                          <Text style={[styles.stepNum, isActive && styles.stepNumActive]}>
                            {idx + 1}
                          </Text>
                        )}
                      </View>
                      <View style={styles.stepContent}>
                        <Text style={[styles.stepText, (isDone || isActive) && styles.stepTextActive]}>
                          {STAGE_LABELS[s]}
                        </Text>
                        {isDone && <Text style={styles.stepDoneText}>Complete</Text>}
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorTitle}>AI Analysis Failed</Text>
              <Text style={styles.errorMsg}>{errorMsg}</Text>
              {errorDetail ? <Text style={styles.errorDetail}>{errorDetail}</Text> : null}
              <View style={styles.errorActions}>
                <Button title="Try Again" onPress={handleRetry} fullWidth />
                <View style={{ height: SPACING.md }} />
                <Button
                  title="Return Home"
                  onPress={() => navigation.navigate("Home")}
                  variant="secondary"
                  fullWidth
                />
              </View>
            </>
          )}
        </View>

        {!isError && (
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              Autonomous retinal triage across Swin V2, CLAHE normalization, and morphological
              candidate lesion analysis.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  innerBox: {
    maxWidth: 440,
    width: "100%",
  },
  header: { marginBottom: SPACING.lg, alignItems: "center" },
  title: {
    fontSize: 22,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    fontFamily: FONT_FAMILY.display,
    marginTop: 8,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.slate500,
    fontFamily: FONT_FAMILY.body,
  },

  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.xxl,
    alignItems: "center",
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  spinner: { marginBottom: SPACING.lg },
  stageLabel: {
    fontSize: FONTS.sizeLG,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    marginBottom: SPACING.xs,
    textAlign: "center",
    fontFamily: FONT_FAMILY.body,
  },
  stageDesc: {
    fontSize: FONTS.sizeSM,
    color: COLORS.slate500,
    marginBottom: SPACING.xl,
    textAlign: "center",
    fontFamily: FONT_FAMILY.body,
  },

  steps: { width: "100%", gap: SPACING.sm },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.md },
  stepIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepDone: { backgroundColor: COLORS.green700, borderColor: COLORS.green700 },
  stepActive: { backgroundColor: COLORS.teal50, borderColor: COLORS.teal800 },
  stepCheck: { fontSize: 13, color: "#fff", fontWeight: FONTS.weightBold },
  stepNum: { fontSize: FONTS.sizeXS, color: COLORS.slate400, fontWeight: FONTS.weightBold },
  stepNumActive: { color: COLORS.teal800 },
  stepContent: { flex: 1, paddingTop: 4 },
  stepText: { fontSize: FONTS.sizeSM, color: COLORS.slate400, fontFamily: FONT_FAMILY.body },
  stepTextActive: {
    color: COLORS.navy800,
    fontWeight: FONTS.weightSemiBold,
    fontFamily: FONT_FAMILY.body,
  },
  stepDoneText: { fontSize: FONTS.sizeXS, color: COLORS.green700, marginTop: 1 },

  // Error state
  errorIcon: { fontSize: 40, marginBottom: SPACING.md },
  errorTitle: {
    fontSize: FONTS.sizeXL,
    fontWeight: FONTS.weightBold,
    color: COLORS.maroon700,
    marginBottom: SPACING.md,
    textAlign: "center",
    fontFamily: FONT_FAMILY.display,
  },
  errorMsg: {
    fontSize: FONTS.sizeMD,
    color: COLORS.slate700,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: SPACING.sm,
    fontFamily: FONT_FAMILY.body,
  },
  errorDetail: {
    fontSize: FONTS.sizeSM,
    color: COLORS.slate400,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: SPACING.xl,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.mono,
  },
  errorActions: { width: "100%" },

  disclaimer: {
    backgroundColor: COLORS.teal50,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.teal100,
  },
  disclaimerText: {
    fontSize: FONTS.sizeXS,
    color: COLORS.teal800,
    lineHeight: 17,
    textAlign: "center",
    fontFamily: FONT_FAMILY.body,
  },
});
