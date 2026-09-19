import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { COLORS, FONTS, SPACING, RADIUS } from "../utils/constants";
import type { HomeStackParamList } from "../types";

type Nav = NativeStackNavigationProp<HomeStackParamList, "EyeSelection">;
type Route = RouteProp<HomeStackParamList, "EyeSelection">;

export default function EyeSelectionScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { patientId, patientName } = params;

  const select = (eye: "left" | "right") => {
    navigation.navigate("ImageCapture", { patientId, patientName, eye });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Eye</Text>
      <Text style={styles.patientName}>{patientName}</Text>
      <Text style={styles.subtitle}>Which eye is being screened today?</Text>

      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.eyeButton} onPress={() => select("left")} activeOpacity={0.75}>
          <Text style={styles.eyeButtonLabel}>Left Eye (OS)</Text>
          <Text style={styles.eyeButtonSub}>Oculus Sinister</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.eyeButton} onPress={() => select("right")} activeOpacity={0.75}>
          <Text style={styles.eyeButtonLabel}>Right Eye (OD)</Text>
          <Text style={styles.eyeButtonSub}>Oculus Dexter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.note}>
        <Text style={styles.noteText}>Each eye is screened separately. To screen both eyes, complete a separate screening for each.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.xl, justifyContent: "center" },
  title: { fontSize: FONTS.size2XL, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 1.5, marginBottom: SPACING.xs },
  patientName: { fontSize: FONTS.sizeLG, color: COLORS.accent, fontWeight: FONTS.weightSemiBold, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONTS.sizeSM, color: COLORS.textSecondary, marginBottom: SPACING.xxxl },
  buttonGroup: { gap: SPACING.lg, marginBottom: SPACING.xxxl },
  eyeButton: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: SPACING.xxl,
    alignItems: "center",
    borderTopColor: COLORS.accent,
    borderTopWidth: 3.5,
  },
  eyeButtonLabel: { fontSize: FONTS.sizeXL, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 2 },
  eyeButtonSub: { fontSize: FONTS.sizeSM, color: COLORS.accent, fontWeight: FONTS.weightSemiBold, marginTop: 4 },
  note: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  noteText: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, lineHeight: 18, textAlign: "center" },
});

