// ============================================================
// RETINOVA — Image Capture Screen (ASHA Field Workflow)
// Mobile-first, large touch targets, practical field UI
// ============================================================
import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { Button } from "../components";
import { COLORS, FONTS, SPACING, RADIUS } from "../utils/constants";
import type { HomeStackParamList } from "../types";

type Nav = NativeStackNavigationProp<HomeStackParamList, "ImageCapture">;
type Route = RouteProp<HomeStackParamList, "ImageCapture">;

export default function ImageCaptureScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { patientId, patientName, eye } = params;
  const [loading, setLoading] = useState(false);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera Permission Required",
        "Please allow camera access in your device settings to capture fundus images."
      );
      return false;
    }
    return true;
  };

  const requestMediaPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Photo Library Permission Required",
        "Please allow photo library access in your device settings to select fundus images."
      );
      return false;
    }
    return true;
  };

  const handleCapture = async () => {
    const granted = await requestCameraPermission();
    if (!granted) return;
    setLoading(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        navigation.navigate("ImagePreview", {
          patientId,
          patientName,
          eye,
          imageUri: asset.uri,
          mimeType: asset.mimeType ?? undefined,
          fileName: asset.fileName ?? undefined,
        });
      }
    } catch (e: any) {
      Alert.alert("Camera Error", e.message || "Unable to open camera.");
    } finally { setLoading(false); }
  };

  const handleChoose = async () => {
    const granted = await requestMediaPermission();
    if (!granted) return;
    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
        allowsEditing: false,
      });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        navigation.navigate("ImagePreview", {
          patientId,
          patientName,
          eye,
          imageUri: asset.uri,
          mimeType: asset.mimeType ?? undefined,
          fileName: asset.fileName ?? undefined,
        });
      }
    } catch (e: any) {
      Alert.alert("Gallery Error", e.message || "Unable to open photo library.");
    } finally { setLoading(false); }
  };

  const eyeLabel = eye === 'left' ? 'Left Eye (OS)' : 'Right Eye (OD)';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Patient context */}
      <View style={styles.patientBanner}>
        <Text style={styles.patientLabel}>Patient</Text>
        <Text style={styles.patientName}>{patientName}</Text>
        <View style={styles.eyeChip}>
          <Text style={styles.eyeChipText}>{eyeLabel}</Text>
        </View>
      </View>

      {/* Camera frame visual */}
      <Text style={styles.captureTitle}>Capture Fundus Image</Text>
      <View style={styles.cameraFrame}>
        <View style={styles.cameraFrameInner}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          <Text style={styles.cameraIcon}>[ ]</Text>
          <Text style={styles.cameraHint}>Position retina within frame</Text>
        </View>
      </View>

      {/* Capture tips */}
      <View style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>Capture Tips</Text>
        <View style={styles.tipRow}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>Center the optic disc and macula in the field of view</Text>
        </View>
        <View style={styles.tipRow}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>Hold steady — avoid blur and camera shake</Text>
        </View>
        <View style={styles.tipRow}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>Ensure adequate illumination before capturing</Text>
        </View>
        <View style={styles.tipRow}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>Capture the entire retinal field of view</Text>
        </View>
        <View style={styles.tipRow}>
          <Text style={styles.tipBullet}>•</Text>
          <Text style={styles.tipText}>Use a compatible fundus camera optical attachment</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Button
          title="Capture Image"
          onPress={handleCapture}
          fullWidth
          loading={loading}
        />
        <View style={{ height: SPACING.md }} />
        <Button
          title="Select from Gallery"
          onPress={handleChoose}
          variant="outline"
          fullWidth
          loading={loading}
        />
      </View>

      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Only upload actual fundus/retinal images. Do not upload non-retinal photographs.
        </Text>
      </View>
    </ScrollView>
  );
}

const CORNER_SIZE = 20;
const CORNER_THICKNESS = 3;

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: SPACING.lg, paddingBottom: 40 },

  // Patient banner
  patientBanner: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  patientLabel: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.textMuted, letterSpacing: 0.8 },
  patientName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, flex: 1 },
  eyeChip: { backgroundColor: COLORS.accentLight, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.accent },
  eyeChipText: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.accent },

  // Camera frame
  captureTitle: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.textMuted, letterSpacing: 1.2, textAlign: 'center', marginBottom: SPACING.md },
  cameraFrame: {
    backgroundColor: '#0D0D0D',
    borderRadius: RADIUS.lg,
    height: 200,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  cameraFrameInner: {
    width: '75%',
    height: '80%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: COLORS.accent,
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  cameraIcon: { fontSize: 36, color: 'rgba(27,99,87,0.6)', textAlign: 'center' },
  cameraHint: { fontSize: FONTS.sizeXS, color: 'rgba(255,255,255,0.6)', marginTop: SPACING.xs, textAlign: 'center' },

  // Tips
  tipsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  tipsTitle: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightSemiBold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  tipRow: { flexDirection: 'row', marginBottom: SPACING.xs },
  tipBullet: { fontSize: FONTS.sizeMD, color: COLORS.accent, marginRight: SPACING.sm, lineHeight: 20 },
  tipText: { flex: 1, fontSize: FONTS.sizeSM, color: COLORS.textSecondary, lineHeight: 20 },

  // Actions
  actions: { marginBottom: SPACING.md },

  // Disclaimer
  disclaimer: {
    backgroundColor: COLORS.warningLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#ECCBB8',
  },
  disclaimerText: { fontSize: FONTS.sizeXS, color: COLORS.warning, textAlign: 'center', lineHeight: 17 },
});
