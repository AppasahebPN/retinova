import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  FONT_FAMILY,
} from "../utils/constants";
import type { AshaHomeStackParamList } from "../types";

type Nav = NativeStackNavigationProp<AshaHomeStackParamList, "EyeSelection">;
type Route = RouteProp<AshaHomeStackParamList, "EyeSelection">;

export default function EyeSelectionScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { patientId, patientName } = params;

  const select = (eye: "left" | "right") => {
    navigation.navigate("ImageCapture", { patientId, patientName, eye });
  };

  return (
    <View style={styles.container}>
      <View style={styles.contentWrap}>
        <Text style={styles.title}>Select Eye</Text>
        <Text style={styles.patientName}>{patientName}</Text>
        <Text style={styles.subtitle}>Which eye is being screened today?</Text>

        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => select("left")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Select Left Eye OS"
          >
            <View style={styles.eyeIconCircle}>
              <Text style={styles.eyeIconText}>OS</Text>
            </View>
            <Text style={styles.eyeButtonLabel}>LEFT EYE</Text>
            <Text style={styles.eyeButtonSub}>Oculus Sinister (OS)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => select("right")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Select Right Eye OD"
          >
            <View style={styles.eyeIconCircle}>
              <Text style={styles.eyeIconText}>OD</Text>
            </View>
            <Text style={styles.eyeButtonLabel}>RIGHT EYE</Text>
            <Text style={styles.eyeButtonSub}>Oculus Dexter (OD)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>Clinical Guideline</Text>
          <Text style={styles.noteText}>
            Each eye is screened and analyzed separately. To screen both eyes, complete a
            separate screening for each.
          </Text>
        </View>
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
  contentWrap: {
    maxWidth: 420,
    width: "100%",
  },
  title: {
    fontSize: 26,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    fontFamily: FONT_FAMILY.display,
    marginBottom: 4,
  },
  patientName: {
    fontSize: 16,
    color: COLORS.teal800,
    fontWeight: FONTS.weightBold,
    marginBottom: 2,
    fontFamily: FONT_FAMILY.body,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.slate500,
    marginBottom: 28,
    fontFamily: FONT_FAMILY.body,
  },
  buttonGroup: {
    gap: 14,
    marginBottom: 28,
  },
  eyeButton: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.borderSubtle,
    padding: 20,
    alignItems: "center",
    ...SHADOWS.card,
  },
  eyeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.teal50,
    borderWidth: 1,
    borderColor: COLORS.teal100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  eyeIconText: {
    fontSize: 14,
    fontWeight: FONTS.weightBold,
    color: COLORS.teal800,
    fontFamily: FONT_FAMILY.mono,
  },
  eyeButtonLabel: {
    fontSize: 18,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    letterSpacing: 1.2,
    fontFamily: FONT_FAMILY.display,
  },
  eyeButtonSub: {
    fontSize: 12,
    color: COLORS.slate500,
    fontWeight: FONTS.weightMedium,
    marginTop: 4,
    fontFamily: FONT_FAMILY.body,
  },
  note: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  noteTitle: {
    fontSize: 10,
    fontWeight: FONTS.weightBold,
    color: COLORS.slate500,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
    fontFamily: FONT_FAMILY.body,
  },
  noteText: {
    fontSize: 12,
    color: COLORS.slate500,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.body,
  },
});
