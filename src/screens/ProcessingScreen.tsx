// ============================================================
// RETINOVA — AI Processing Screen (ASHA Field Workflow)
// Professional medical AI analysis status — no fake progress
// ============================================================
import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, BackHandler } from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { screeningService } from "../services/screeningService";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components";
import { COLORS, FONTS, SPACING, RADIUS } from "../utils/constants";
import type { HomeStackParamList } from "../types";

type Nav = NativeStackNavigationProp<HomeStackParamList, "Processing">;
type Route = RouteProp<HomeStackParamList, "Processing">;

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
        if (stage !== "error") return true; // block back during processing
        return false;
      });
      return () => sub.remove();
    }, [stage])
  );

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
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
        console.log("[RETINOVA MOBILE FLOW] step=STAGE_UPLOADING", { patientId, eye });
      }

      // STEP 1: Upload fundus image
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

      // STEP 3: Trigger backend AI analysis on this EXACT screening ID
      if (isMounted.current) setStage("analyzing");
      if (__DEV__) {
        console.log("[RETINOVA MOBILE FLOW] step=STAGE_ANALYZING", { screeningId });
      }

      const analyzed = await screeningService.runAnalysis(screeningId);
      if (!isMounted.current) return;

      // STEP 4: Evidence verification
      if (isMounted.current) setStage("evidence");
      if (__DEV__) {
        console.log("[RETINOVA MOBILE FLOW] step=STAGE_EVIDENCE", {
          screeningId,
          hasGradCam: !!analyzed.explainability?.gradcam_url,
          hasVessels: !!analyzed.segmentation?.vessel_mask_url,
          hasLesions: !!analyzed.segmentation?.lesion_mask_url,
        });
      }

      // STEP 5: Complete — navigate to result with EXACT screening ID
      if (isMounted.current) setStage("complete");
      setTimeout(() => {
        if (isMounted.current) {
          navigation.replace("ScreeningResult", { screeningId });
        }
      }, 500);
    } catch (e: any) {
      isRunning.current = false;
      if (!isMounted.current) return;
      const rawMsg = e.message || "An unexpected error occurred.";
      if (__DEV__) {
        console.error("[RETINOVA MOBILE FLOW] step=ERROR", { error: rawMsg });
      }

      let userMsg = rawMsg;
      let detail = rawMsg;
      if (rawMsg.toLowerCase().includes("connection") || rawMsg.toLowerCase().includes("network") || rawMsg.toLowerCase().includes("fetch")) {
        userMsg = "Cannot connect to RETINOVA backend. Please check your network connection.";
        detail = rawMsg;
      } else if (rawMsg.toLowerCase().includes("upload")) {
        userMsg = "Image upload failed. Please try selecting the image again.";
        detail = rawMsg;
      } else if (rawMsg.toLowerCase().includes("timed out") || rawMsg.toLowerCase().includes("timeout")) {
        userMsg = "The AI analysis timed out. The server may be busy — please try again.";
        detail = rawMsg;
      } else if (rawMsg.toLowerCase().includes("quality") || rawMsg.toLowerCase().includes("reject")) {
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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>RETINOVA</Text>
        <Text style={styles.title}>AI Screening</Text>
        <Text style={styles.subtitle}>{patientName}  ·  {eye.toUpperCase() === 'LEFT' ? 'Left Eye (OS)' : 'Right Eye (OD)'}</Text>
      </View>

      {/* Status card */}
      <View style={styles.statusCard}>
        {!isError ? (
          <>
            <ActivityIndicator color={COLORS.accent} size="large" style={styles.spinner} />
            <Text style={styles.stageLabel}>{STAGE_LABELS[stage]}</Text>
            <Text style={styles.stageDesc}>{STAGE_DESCRIPTIONS[stage]}</Text>

            <View style={styles.steps}>
              {ORDERED_STAGES.map((s, idx) => {
                const isDone = idx < currentIdx;
                const isActive = s === stage;
                return (
                  <View key={s} style={styles.stepRow}>
                    <View style={[
                      styles.stepIndicator,
                      isDone && styles.stepDone,
                      isActive && styles.stepActive,
                    ]}>
                      {isDone ? (
                        <Text style={styles.stepCheck}>✓</Text>
                      ) : (
                        <Text style={[styles.stepNum, isActive && styles.stepNumActive]}>{idx + 1}</Text>
                      )}
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={[styles.stepText, (isDone || isActive) && styles.stepTextActive]}>
                        {STAGE_LABELS[s]}
                      </Text>
                      {isDone && (
                        <Text style={styles.stepDoneText}>Complete</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.errorIcon}>!</Text>
            <Text style={styles.errorTitle}>AI Analysis Failed</Text>
            <Text style={styles.errorMsg}>{errorMsg}</Text>
            {errorDetail ? (
              <Text style={styles.errorDetail}>{errorDetail}</Text>
            ) : null}
            <View style={styles.errorActions}>
              <Button title="Try Again" onPress={handleRetry} fullWidth />
              <View style={{ height: SPACING.md }} />
              <Button
                title="Return Home"
                onPress={() => navigation.navigate("Home")}
                variant="outline"
                fullWidth
              />
            </View>
          </>
        )}
      </View>

      {!isError && (
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            RETINOVA AI screening supports referral triage. Final clinical diagnosis must be performed by a qualified ophthalmologist.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.xl },

  header: { marginBottom: SPACING.xl },
  appName: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.accent, letterSpacing: 2, marginBottom: 2 },
  title: { fontSize: FONTS.size2XL, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 1 },
  subtitle: { fontSize: FONTS.sizeSM, color: COLORS.textMuted, marginTop: 4 },

  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xxl,
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  spinner: { marginBottom: SPACING.lg },
  stageLabel: { fontSize: FONTS.sizeLG, fontWeight: FONTS.weightSemiBold, color: COLORS.textPrimary, marginBottom: SPACING.xs, textAlign: "center" },
  stageDesc: { fontSize: FONTS.sizeSM, color: COLORS.textMuted, marginBottom: SPACING.xl, textAlign: "center" },

  steps: { width: "100%", gap: SPACING.sm },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACING.md },
  stepIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepDone: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  stepActive: { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent },
  stepCheck: { fontSize: 13, color: '#fff', fontWeight: FONTS.weightBold },
  stepNum: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, fontWeight: FONTS.weightBold },
  stepNumActive: { color: COLORS.accent },
  stepContent: { flex: 1, paddingTop: 4 },
  stepText: { fontSize: FONTS.sizeSM, color: COLORS.textMuted },
  stepTextActive: { color: COLORS.textPrimary, fontWeight: FONTS.weightMedium },
  stepDoneText: { fontSize: FONTS.sizeXS, color: COLORS.success, marginTop: 1 },

  // Error state
  errorIcon: { fontSize: 40, color: COLORS.error, marginBottom: SPACING.md },
  errorTitle: { fontSize: FONTS.sizeXL, fontWeight: FONTS.weightBold, color: COLORS.error, marginBottom: SPACING.md, textAlign: "center", letterSpacing: 0.5 },
  errorMsg: { fontSize: FONTS.sizeMD, color: COLORS.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: SPACING.sm },
  errorDetail: { fontSize: FONTS.sizeSM, color: COLORS.textMuted, textAlign: "center", fontStyle: "italic", marginBottom: SPACING.xl, lineHeight: 18 },
  errorActions: { width: "100%" },

  disclaimer: {
    backgroundColor: COLORS.infoLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "#C0D8EE",
  },
  disclaimerText: { fontSize: FONTS.sizeXS, color: COLORS.info, lineHeight: 17, textAlign: "center" },
});
