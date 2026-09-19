import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { screeningService } from "../services/screeningService";
import { StatusBadge, EmptyState, SectionHeader } from "../components";
import { COLORS, FONTS, SPACING, RADIUS, GRADE_SHORT } from "../utils/constants";
import type { Screening, HistoryStackParamList } from "../types";

type Nav = NativeStackNavigationProp<HistoryStackParamList, "History">;

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return iso; }
}

function decisionType(d?: string): "screen" | "refer" | "recapture" | "neutral" {
  if (d === "SCREEN") return "screen";
  if (d === "REFER") return "refer";
  if (d === "RECAPTURE") return "recapture";
  return "neutral";
}

export default function HistoryScreen() {
  const navigation = useNavigation<Nav>();
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await screeningService.list({ limit: 50 });
      setScreenings(data.screenings || []);
    } catch (e: any) {
      setError(e.message || "Unable to load screening history.");
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator color={COLORS.accent} size="large" />
      <Text style={styles.loadingText}>Loading history...</Text>
    </View>
  );

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <View style={styles.brandRow}>
            <Text style={styles.appName}>RETINOVA</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>ASHA Screener</Text>
            </View>
          </View>
          <Text style={styles.title}>Screening History</Text>
        </View>
        <Text style={styles.count}>{screenings.length} record{screenings.length !== 1 ? "s" : ""}</Text>
      </View>

      <FlatList
        data={screenings}
        keyExtractor={s => s.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
        ListEmptyComponent={<EmptyState message="No screenings recorded yet." />}
        contentContainerStyle={styles.list}
        renderItem={({ item: s }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate("ScreeningDetail", { screeningId: s.id })}
            activeOpacity={0.75}
          >
            <View style={styles.rowTop}>
              <Text style={styles.patientName}>{s.patient?.name || s.patient_id}</Text>
              <Text style={styles.date}>{formatDate(s.created_at)}</Text>
            </View>
            <View style={styles.rowBottom}>
              <Text style={styles.meta}>{s.eye === 'left' ? 'Left Eye (OS)' : 'Right Eye (OD)'}</Text>
              {s.classification ? (
                <View style={styles.badges}>
                  <Text style={styles.grade}>{GRADE_SHORT[s.classification.predicted_grade] ?? "--"}</Text>
                  <StatusBadge label={s.classification.decision} type={decisionType(s.classification.decision)} />
                </View>
              ) : (
                <StatusBadge label={(s.status || "pending").toUpperCase()} type="neutral" />
              )}
            </View>
            <Text style={styles.screeningIdText}>ID: {s.id}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xxxl, gap: SPACING.md },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: SPACING.xs, marginBottom: 2 },
  appName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 2 },
  roleBadge: { backgroundColor: COLORS.accentLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.accent },
  roleBadgeText: { fontSize: 9.5, fontWeight: FONTS.weightBold, color: COLORS.accent },
  title: { fontSize: FONTS.sizeLG, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  count: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, paddingBottom: 2 },
  list: { padding: SPACING.lg, paddingBottom: 40 },
  row: { backgroundColor: COLORS.surface, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg, marginBottom: SPACING.sm },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.xs },
  rowBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: SPACING.xs },
  patientName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, flex: 1 },
  date: { fontSize: FONTS.sizeXS, color: COLORS.textMuted },
  meta: { fontSize: FONTS.sizeSM, color: COLORS.textSecondary },
  badges: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  grade: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightBold, color: COLORS.textSecondary },
  screeningIdText: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, fontFamily: "monospace", marginTop: 4 },
  loadingText: { marginTop: SPACING.md, fontSize: FONTS.sizeMD, color: COLORS.textSecondary },
  errorText: { fontSize: FONTS.sizeMD, color: COLORS.textSecondary, textAlign: "center" },
});
