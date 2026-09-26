import React from "react";
import { View, Text, StyleSheet, Image, ScrollView } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";
import { Button } from "../components";
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  FONT_FAMILY,
} from "../utils/constants";
import type { AshaHomeStackParamList } from "../types";

type Nav = NativeStackNavigationProp<AshaHomeStackParamList, "ImagePreview">;
type Route = RouteProp<AshaHomeStackParamList, "ImagePreview">;

export default function ImagePreviewScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { patientId, patientName, eye, imageUri, mimeType, fileName } = params;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.contentWrap}>
        <Text style={styles.title}>Fundus Image Preview</Text>
        <Text style={styles.subtitle}>
          {patientName} · {eye.toUpperCase()} Eye ({eye === "left" ? "OS" : "OD"})
        </Text>

        <View style={styles.imageContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.image}
            resizeMode="contain"
            accessibilityLabel="Captured fundus image preview"
          />
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeIcon}>ℹ️</Text>
          <Text style={styles.noticeText}>
            Verify the optic disc and macula are clearly visible before proceeding. Low
            quality or blur will trigger an automatic recapture flag.
          </Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="USE THIS IMAGE"
            onPress={() =>
              navigation.navigate("Processing", {
                patientId,
                patientName,
                eye,
                imageUri,
                mimeType,
                fileName,
              })
            }
            fullWidth
          />
          <View style={{ height: SPACING.md }} />
          <Button
            title="Retake Image"
            onPress={() =>
              navigation.navigate("ImageCapture", { patientId, patientName, eye })
            }
            variant="secondary"
            fullWidth
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  content: {
    padding: SPACING.lg,
    paddingBottom: 40,
    alignItems: "center",
  },
  contentWrap: {
    maxWidth: 480,
    width: "100%",
  },
  title: {
    fontSize: 24,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    fontFamily: FONT_FAMILY.display,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.slate500,
    marginBottom: 20,
    fontFamily: FONT_FAMILY.body,
  },
  imageContainer: {
    backgroundColor: "#111111",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 16,
    overflow: "hidden",
    height: 320,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.card,
  },
  image: { width: "100%", height: 320 },
  notice: {
    backgroundColor: COLORS.teal50,
    borderRadius: RADIUS.md,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.teal100,
    marginBottom: 24,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  noticeIcon: { fontSize: 16 },
  noticeText: {
    fontSize: 12,
    color: COLORS.teal800,
    lineHeight: 18,
    flex: 1,
    fontFamily: FONT_FAMILY.body,
  },
  actions: {},
});
