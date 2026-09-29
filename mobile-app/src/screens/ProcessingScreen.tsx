// ============================================================
// RETINOVA — AI Processing Screen (ASHA Field Workflow)
// True Offline-First Architecture:
// 1. Real on-device Swin V2 Tiny ONNX inference (100% offline)
// 2. Local persistence in on-device database
// 3. Autonomous cloud synchronization for multi-modal evidence
// ============================================================
import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, ActivityIndicator, BackHandler } from "react-native";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { screeningService } from "../services/screeningService";
import { aiModel } from "../services/aiModel";
import { localDatabase } from "../services/localDatabase";
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

type Stage = "preprocessing" | "analyzing" | "persisting" | "syncing" | "complete" | "error";

const STAGE_LABELS: Record<Stage, string> = {
  preprocessing: "Preprocessing retinal image...",
  analyzing: "Running on-device Swin V2 Tiny AI...",
  persisting: "Saving screening locally...",
  syncing: "Cloud synchronization...",
  complete: "Screening triage complete",
  error: "AI analysis failed",
};

const STAGE_DESCRIPTIONS: Record<Stage, string> = {
  preprocessing: "Circular FOV detection, aspect-preserving padding & bicubic 512x512 resampling",
  analyzing: "Executing real on-device ONNX forward pass & decision calibration (100% offline)",
  persisting: "Writing detection event and clinical biomarkers to local offline storage",
  syncing: "Uploading to cloud for multi-modal Grad-CAM and central monitoring",
  complete: "Screening result ready for clinical review",
  error: "",
};

const ORDERED_STAGES: Stage[] = ["preprocessing", "analyzing", "persisting", "syncing", "complete"];

export default function ProcessingScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { patientId, patientName, eye, imageUri, mimeType, fileName } = params;
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("preprocessing");
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
      setStage("preprocessing");
      setErrorMsg("");
      setErrorDetail("");
    }

    try {
      if (__DEV__) {
        console.log("[RETINOVA FLOW] Starting Edge AI Screening Flow", { patientId, eye });
      }

      // ============================================================
      // STEP 1: REAL CLINICAL PREPROCESSING
      // ============================================================
      if (isMounted.current) setStage("preprocessing");
      const preprocessed = await aiModel.preprocess(imageUri);
      if (!isMounted.current) return;

      // ============================================================
      // STEP 2: REAL ON-DEVICE SWIN V2 TINY INFERENCE (100% OFFLINE)
      // Zero HTTP/Network requests required for this step
      // ============================================================
      if (isMounted.current) setStage("analyzing");
      if (__DEV__) {
        console.log("[RETINOVA FLOW] Executing ONNX Swin V2 Tiny inference on-device...");
      }

      const prediction = await aiModel.predict(preprocessed);
      if (!isMounted.current) return;

      if (__DEV__) {
        console.log("[RETINOVA FLOW] Real inference result:", {
          grade: prediction.grade,
          label: prediction.gradeLabel,
          decision: prediction.decision,
          pReferable: prediction.referableProbability,
          confidence: prediction.confidence,
          latencyMs: prediction.processingTimeMs,
        });
      }

      // ============================================================
      // STEP 3: PERSIST LOCALLY TO SECURE DATABASE
      // Guaranteed local storage regardless of connectivity
      // ============================================================
      if (isMounted.current) setStage("persisting");
      const localEventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const localRecord = await localDatabase.insertEvent({
        eventId: localEventId,
        timestamp: new Date().toISOString(),
        detectionType: prediction.gradeLabel,
        confidence: prediction.confidence,
        severity: prediction.severity,
        latitude: 13.0827,
        longitude: 80.2707,
        localImagePath: imageUri,
        modelVersion: prediction.modelVersion,
        syncStatus: "PENDING",
        metadata: {
          patientId: patientId || "PATIENT_LOCAL",
          patientName: patientName || "Field Screening Subject",
          eye,
          grade: prediction.grade,
          decision: prediction.decision,
          isReferable: prediction.isReferable,
          referableProbability: prediction.referableProbability,
          rawProbabilities: prediction.rawProbabilities,
          rawLogits: prediction.rawLogits,
          recommendation: prediction.recommendation,
          processingTimeMs: prediction.processingTimeMs,
          features: prediction.features,
        },
      });

      let finalScreeningId = localRecord.eventId;

      // ============================================================
      // STEP 4: AUTONOMOUS CLOUD SYNC & EVIDENCE GENERATION
      // Graceful offline degradation: never fails if network is absent
      // ============================================================
      if (isMounted.current) setStage("syncing");

      try {
        const filename = `fundus_${eye}_${Date.now()}.jpg`;
        const upload = await screeningService.uploadImage(imageUri, filename, mimeType, fileName);

        if (upload && upload.storageUrl) {
          const screening = await screeningService.create({
            patientId,
            eye,
            facilityId: user?.facility_id,
            imageStorageUrl: upload.storageUrl,
            originalFilename: upload.originalFilename,
          });

          if (screening?.id) {
            finalScreeningId = screening.id;

            // Trigger cloud multi-modal analysis (Grad-CAM, vessels, lesion masks)
            const analyzed = await screeningService.runAnalysis(screening.id).catch((cloudErr) => {
              if (__DEV__) {
                console.warn("[RETINOVA] Cloud analysis deferred:", cloudErr);
              }
              return null;
            });

            // Mark locally as SYNCED
            await localDatabase.updateSyncStatus(
              localEventId,
              "SYNCED",
              upload.storageUrl
            );

            if (analyzed && localRecord.metadata) {
              localRecord.metadata.segmentation = analyzed.segmentation;
              localRecord.metadata.explainability = analyzed.explainability;
            }
          }
        }
      } catch (networkSyncErr: any) {
        // Network unavailable, offline, or server busy
        // This is completely expected in field offline scenarios!
        if (__DEV__) {
          console.log("[RETINOVA FLOW] Offline screening recorded. Sync deferred to background sync daemon:", networkSyncErr.message);
        }
        await localDatabase.updateSyncStatus(
          localEventId,
          "PENDING",
          undefined,
          `Offline: ${networkSyncErr.message || "Network unavailable"}`
        );
      }

      // ============================================================
      // STEP 5: SCREENING TRIAGE COMPLETE — NAVIGATE TO RESULT
      // ============================================================
      if (isMounted.current) setStage("complete");
      setTimeout(() => {
        if (isMounted.current) {
          navigation.replace("ScreeningResult", { screeningId: finalScreeningId });
        }
      }, 400);
    } catch (e: any) {
      isRunning.current = false;
      if (!isMounted.current) return;
      const rawMsg = e.message || "An unexpected error occurred during AI analysis.";
      if (__DEV__) {
        console.error("[RETINOVA FLOW] On-device AI execution error:", rawMsg);
      }

      setErrorMsg("On-device AI analysis failed. Please ensure the retinal image is valid.");
      setErrorDetail(rawMsg);
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
          <Text style={styles.title}>AI Retinal Screening</Text>
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
              Edge AI • Swin Transformer V2 Tiny • Offline Decision Calibration • Zero Cloud Latency
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
