import React from "react";
import { View, Text, StyleSheet, Image, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { Button } from "../components";
import { COLORS, FONTS, SPACING, RADIUS } from "../utils/constants";
import type { HomeStackParamList } from "../types";

type Nav = NativeStackNavigationProp<HomeStackParamList, "ImagePreview">;
type Route = RouteProp<HomeStackParamList, "ImagePreview">;

export default function ImagePreviewScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { patientId, patientName, eye, imageUri, mimeType, fileName } = params;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Fundus Image Preview</Text>
      <Text style={styles.subtitle}>{patientName}  ·  {eye.toUpperCase()} Eye ({eye === "left" ? "OS" : "OD"})</Text>

      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
          accessibilityLabel="Captured fundus image preview"
        />
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeText}>
          Verify the retina is clearly visible before proceeding. A blurry or unusable image will require recapture.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Use This Image"
          onPress={() => navigation.navigate("Processing", { patientId, patientName, eye, imageUri, mimeType, fileName })}
          fullWidth
        />
        <View style={{ height: SPACING.md }} />
        <Button
          title="Retake / Choose Another"
          onPress={() => navigation.navigate("ImageCapture", { patientId, patientName, eye })}
          variant="outline"
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl, paddingBottom: 40 },
  title: { fontSize: FONTS.size2XL, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 1, marginBottom: SPACING.xs },
  subtitle: { fontSize: FONTS.sizeSM, color: COLORS.textMuted, marginBottom: SPACING.xl },
  imageContainer: {
    backgroundColor: "#0A0A0A",
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.xl, overflow: "hidden", height: 300,
    alignItems: "center", justifyContent: "center",
  },
  image: { width: "100%", height: 300 },
  notice: { backgroundColor: COLORS.infoLight, borderRadius: RADIUS.md, padding: SPACING.md, borderWidth: 1, borderColor: "#C0D8EE", marginBottom: SPACING.xl },
  noticeText: { fontSize: FONTS.sizeXS, color: COLORS.info, lineHeight: 18, textAlign: "center" },
  actions: {},
});

