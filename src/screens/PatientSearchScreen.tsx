import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { patientService } from "../services/patientService";
import { FormInput, Button, EmptyState } from "../components";
import { COLORS, FONTS, SPACING, RADIUS } from "../utils/constants";
import type { Patient, HomeStackParamList } from "../types";

type Nav = NativeStackNavigationProp<HomeStackParamList, "PatientSearch">;

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
    } finally { setLoading(false); }
  }, [query]);

  const selectPatient = (p: Patient) => {
    navigation.navigate("EyeSelection", { patientId: p.id, patientName: p.name });
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <FormInput
          label="Search Patient"
          value={query}
          onChangeText={setQuery}
          placeholder="Name, phone, or location..."
          returnKeyType="search"
          onSubmitEditing={search}
          style={{ marginBottom: 0 }}
        />
        <Button title="Search" onPress={search} loading={loading} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading && <ActivityIndicator color={COLORS.accent} style={{ marginTop: SPACING.xl }} />}

      {searched && results.length === 0 && !loading && (
        <EmptyState message={"No patient found.\nRegister a new patient below."} />
      )}

      <FlatList
        data={results}
        keyExtractor={p => p.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.patientRow} onPress={() => selectPatient(item)} activeOpacity={0.75}>
            <Text style={styles.patientName}>{item.name}</Text>
            <Text style={styles.patientMeta}>
              {item.age} yrs · {item.gender} · {item.location}
            </Text>
            {item.phone ? <Text style={styles.patientPhone}>{item.phone}</Text> : null}
          </TouchableOpacity>
        )}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 20 }}
      />

      <View style={styles.footer}>
        <Text style={styles.footerNote}>Patient not found?</Text>
        <Button title="Register New Patient" onPress={() => navigation.navigate("NewPatient")} variant="outline" fullWidth />
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
    borderBottomColor: COLORS.border,
    gap: SPACING.md,
  },
  error: { color: COLORS.error, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, fontSize: FONTS.sizeSM },
  patientRow: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  patientName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  patientMeta: { fontSize: FONTS.sizeSM, color: COLORS.textSecondary, marginTop: 4 },
  patientPhone: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 4 },
  footer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.sm,
  },
  footerNote: { fontSize: FONTS.sizeSM, color: COLORS.textSecondary, marginBottom: 2 },
});
