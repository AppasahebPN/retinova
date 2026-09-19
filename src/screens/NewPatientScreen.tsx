import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { patientService } from "../services/patientService";
import { useAuth } from "../hooks/useAuth";
import { FormInput, Button } from "../components";
import { COLORS, FONTS, SPACING, RADIUS } from "../utils/constants";
import type { HomeStackParamList } from "../types";

type Nav = NativeStackNavigationProp<HomeStackParamList, "NewPatient">;

const GENDER_OPTIONS = ["male", "female", "other"];

export default function NewPatientScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [diabetesDuration, setDiabetesDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Patient name is required.";
    if (!age.trim() || isNaN(Number(age)) || Number(age) < 1 || Number(age) > 120)
      e.age = "Please enter a valid age (1-120).";
    if (!location.trim()) e.location = "Location is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    if (!user?.facility_id) {
      Alert.alert("Error", "Your account is not associated with a facility. Contact your administrator.");
      return;
    }
    setLoading(true);
    try {
      const patient = await patientService.register({
        name: name.trim(),
        age: Number(age),
        gender,
        location: location.trim(),
        phone: phone.trim() || undefined,
        diabetes_duration_years: diabetesDuration ? Number(diabetesDuration) : undefined,
        facility_id: user.facility_id,
      });
      navigation.navigate("EyeSelection", { patientId: patient.id, patientName: patient.name });
    } catch (e: any) {
      Alert.alert("Registration Failed", e.message || "Unable to register patient. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Register New Patient</Text>
        <Text style={styles.subtitle}>Fill in the patient details below. Name, age, and location are required.</Text>

        <FormInput label="Full Name *" value={name} onChangeText={setName} placeholder="Patient full name" error={errors.name} />
        <FormInput label="Age (years) *" value={age} onChangeText={setAge} keyboardType="numeric" placeholder="e.g. 52" error={errors.age} />

        <Text style={styles.fieldLabel}>Gender *</Text>
        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map(g => (
            <TouchableOpacity
              key={g}
              style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
              onPress={() => setGender(g)}
            >
              <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FormInput label="Village / Location *" value={location} onChangeText={setLocation} placeholder="Village or area name" error={errors.location} />
        <FormInput label="Phone Number (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="10-digit mobile number" />
        <FormInput label="Diabetes Duration (years, optional)" value={diabetesDuration} onChangeText={setDiabetesDuration} keyboardType="numeric" placeholder="e.g. 5" />

        <Button title={loading ? "Registering..." : "Register and Continue"} onPress={submit} loading={loading} fullWidth />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.xl, paddingBottom: 40 },
  title: { fontSize: FONTS.size2XL, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, marginBottom: SPACING.xs, letterSpacing: 1 },
  subtitle: { fontSize: FONTS.sizeSM, color: COLORS.textSecondary, marginBottom: SPACING.xl, lineHeight: 20 },
  fieldLabel: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightMedium, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  genderRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.lg },
  genderBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", backgroundColor: COLORS.surface },
  genderBtnActive: { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent },
  genderText: { fontSize: FONTS.sizeMD, color: COLORS.textSecondary, fontWeight: FONTS.weightMedium },
  genderTextActive: { color: COLORS.accent, fontWeight: FONTS.weightBold },
});
