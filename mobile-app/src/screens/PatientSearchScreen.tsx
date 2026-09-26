import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { patientService } from "../services/patientService";
import { FormInput, Button, EmptyState, AvatarInitial } from "../components";
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  FONT_FAMILY,
} from "../utils/constants";
import type { Patient, AshaHomeStackParamList } from "../types";

type Nav = NativeStackNavigationProp<AshaHomeStackParamList, "PatientSearch">;

export default function PatientSearchScreen() {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      const data = await patientService.search(query.trim());
      setResults(data);
      setSearched(true);
    } catch (e: any) {
      setError(e.message || "Unable to search patients.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  const selectPatient = (p: Patient) => {
    navigation.navigate("EyeSelection", { patientId: p.id, patientName: p.name });
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Text style={styles.sectionLabel}>Search Patient</Text>
        <FormInput
          label=""
          value={query}
          onChangeText={setQuery}
          placeholder="Enter patient name, phone, or location..."
          returnKeyType="search"
          onSubmitEditing={search}
          style={{ marginBottom: 0 }}
        />
        <Button title="Search" onPress={search} loading={loading} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading && (
        <ActivityIndicator color={COLORS.teal800} style={{ marginTop: SPACING.xl }} />
      )}

      {searched && results.length === 0 && !loading && (
        <EmptyState message={"No patient found.\nRegister a new patient below."} />
      )}

      <FlatList
        data={results}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.patientRow}
            onPress={() => selectPatient(item)}
            activeOpacity={0.8}
          >
            <AvatarInitial name={item.name} size={42} />
            <View style={{ flex: 1 }}>
              <Text style={styles.patientName}>{item.name}</Text>
              <Text style={styles.patientMeta}>
                {item.age} yrs · {item.gender} · {item.location}
              </Text>
              {item.phone ? <Text style={styles.patientPhone}>{item.phone}</Text> : null}
            </View>
            <Text style={styles.rowChevron}>›</Text>
          </TouchableOpacity>
        )}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 20 }}
      />

      <View style={styles.footer}>
        <Text style={styles.footerNote}>Patient not found?</Text>
        <Button
          title="Register New Patient"
          onPress={() => navigation.navigate("NewPatient")}
          variant="secondary"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  searchBar: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    gap: SPACING.sm,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: FONTS.weightBold,
    color: COLORS.slate500,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    fontFamily: FONT_FAMILY.body,
  },
  error: {
    color: COLORS.maroon700,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    fontSize: FONTS.sizeSM,
    fontFamily: FONT_FAMILY.body,
  },
  patientRow: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    ...SHADOWS.card,
  },
  patientName: {
    fontSize: FONTS.sizeMD,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    fontFamily: FONT_FAMILY.body,
  },
  patientMeta: {
    fontSize: FONTS.sizeSM,
    color: COLORS.slate500,
    marginTop: 2,
    fontFamily: FONT_FAMILY.body,
  },
  patientPhone: {
    fontSize: FONTS.sizeXS,
    color: COLORS.slate400,
    marginTop: 2,
    fontFamily: FONT_FAMILY.mono,
  },
  rowChevron: {
    fontSize: 22,
    color: COLORS.slate400,
    paddingRight: 4,
  },
  footer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    gap: SPACING.xs,
  },
  footerNote: {
    fontSize: FONTS.sizeSM,
    color: COLORS.slate500,
    marginBottom: 4,
    fontFamily: FONT_FAMILY.body,
  },
});
