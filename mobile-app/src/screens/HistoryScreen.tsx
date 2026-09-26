import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { screeningService } from "../services/screeningService";
import { StatusBadge, EmptyState, AvatarInitial, RetinovaLogo } from "../components";
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  FONT_FAMILY,
  GRADE_SHORT,
} from "../utils/constants";
import type { Screening, AshaHistoryStackParamList } from "../types";

type Nav = NativeStackNavigationProp<AshaHistoryStackParamList, "History">;

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );
  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.teal800} size="large" />
        <Text style={styles.loadingText}>Loading history...</Text>
      </View>
    );

  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.brandRow}>
            <RetinovaLogo size="sm" />
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>ASHA Worker</Text>
            </View>
          </View>
          <Text style={styles.title}>Screening History</Text>
        </View>
        <Text style={styles.count}>
          {screenings.length} record{screenings.length !== 1 ? "s" : ""}
        </Text>
      </View>

      <FlatList
        data={screenings}
        keyExtractor={(s) => s.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.teal800}
          />
        }
        ListEmptyComponent={<EmptyState message="No screenings recorded yet." />}
        contentContainerStyle={styles.list}
        renderItem={({ item: s }) => {
          const patientName = s.patient?.name || s.patient_id;
          const grade = s.classification?.predicted_grade;
          const dt = decisionType(s.classification?.decision);

          return (
            <TouchableOpacity
              style={styles.rowCard}
              onPress={() => navigation.navigate("ScreeningDetail", { screeningId: s.id })}
              activeOpacity={0.8}
            >
              <AvatarInitial name={patientName} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>{patientName}</Text>
                <Text style={styles.meta}>
                  {formatDate(s.created_at)} · {s.eye === "left" ? "OS (Left)" : "OD (Right)"}
                  {grade !== undefined ? ` · Grade ${GRADE_SHORT[grade]}` : ""}
                </Text>
                <Text style={styles.screeningIdText}>ID: {s.id}</Text>
              </View>
              {s.classification ? (
                <StatusBadge
                  label={s.classification.decision}
                  type={dt}
                />
              ) : (
                <StatusBadge
                  label={(s.status || "pending").toUpperCase()}
                  type="neutral"
                />
              )}
              <Text style={styles.rowChevron}>›</Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: SPACING.xxxl,
    gap: SPACING.md,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  roleBadge: {
    backgroundColor: COLORS.teal50,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.teal100,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: FONTS.weightBold,
    color: COLORS.teal800,
    letterSpacing: 0.5,
    fontFamily: FONT_FAMILY.body,
  },
  title: {
    fontSize: 20,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    fontFamily: FONT_FAMILY.display,
  },
  count: {
    fontSize: 12,
    color: COLORS.slate500,
    paddingBottom: 2,
    fontFamily: FONT_FAMILY.body,
  },
  list: { padding: SPACING.lg, paddingBottom: 40 },
  rowCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 14,
    marginBottom: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...SHADOWS.card,
  },
  patientName: {
    fontSize: 15,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    fontFamily: FONT_FAMILY.body,
  },
  meta: {
    fontSize: 12,
    color: COLORS.slate500,
    marginTop: 2,
    fontFamily: FONT_FAMILY.body,
  },
  screeningIdText: {
    fontSize: 10,
    color: COLORS.slate400,
    fontFamily: FONT_FAMILY.mono,
    marginTop: 3,
  },
  rowChevron: {
    fontSize: 22,
    color: COLORS.slate400,
    paddingLeft: 4,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizeMD,
    color: COLORS.slate500,
    fontFamily: FONT_FAMILY.body,
  },
  errorText: {
    fontSize: FONTS.sizeMD,
    color: COLORS.maroon700,
    textAlign: "center",
    fontFamily: FONT_FAMILY.body,
  },
});
