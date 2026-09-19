// ============================================================
// RETINOVA — District Screenings Ledger (Role 2)
// Real Backend Screenings Query & Multi-Parameter Filter
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { screeningService } from '../../services/screeningService';
import { FilterChip, StatusBadge } from '../../components';
import { COLORS, FONTS, SPACING, RADIUS, GRADE_SHORT, GRADE_LABELS } from '../../utils/constants';
import type { Screening } from '../../types';

export default function DistrictScreeningsScreen() {
  const navigation = useNavigation<any>();
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<number | undefined>(undefined);
  const [selectedDecision, setSelectedDecision] = useState<string | undefined>(undefined);

  const fetchScreenings = async () => {
    try {
      setLoading(true);
      const res = await screeningService.list({
        grade: selectedGrade,
        decision: selectedDecision,
        limit: 50,
      });
      setScreenings(res.screenings || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.warn('Failed to load district screenings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScreenings();
  }, [selectedGrade, selectedDecision]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchScreenings();
  };

  const filtered = screenings.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const patientName = s.patient?.name?.toLowerCase() || '';
    const screeningId = s.id.toLowerCase();
    const location = s.patient?.location?.toLowerCase() || '';
    return patientName.includes(q) || screeningId.includes(q) || location.includes(q);
  });

  const renderItem = ({ item }: { item: Screening }) => {
    const grade = item.classification?.predicted_grade;
    const decision = item.classification?.decision ?? (item.quality?.accepted === false ? 'RECAPTURE' : 'Awaiting update');
    const isRefer = decision === 'REFER';
    const isScreen = decision === 'SCREEN';
    const isRecapture = decision === 'RECAPTURE';
    const risk = item.classification?.g2plus_probability_calibrated;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('SharedScreeningDetail', { screeningId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{item.patient?.name || 'Patient Record'}</Text>
            <Text style={styles.metaText}>
              {item.eye?.toUpperCase()}     {new Date(item.created_at).toLocaleDateString('en-IN')}     ID: {item.id.slice(0, 8)}...
            </Text>
          </View>
          <StatusBadge
            label={decision}
            type={isRefer ? 'refer' : isScreen ? 'screen' : isRecapture ? 'recapture' : 'neutral'}
          />
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBottom}>
          <View style={styles.gradeBadge}>
            <Text style={styles.gradeText}>{grade !== undefined ? GRADE_SHORT[grade] : '--'}</Text>
            <Text style={styles.gradeSub}>{grade !== undefined ? GRADE_LABELS[grade] : 'Not graded'}</Text>
          </View>
          {risk !== undefined && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.riskLabel}>Calibrated Risk</Text>
              <Text style={styles.riskVal}>{(risk * 100).toFixed(1)}%</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search & Filter Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Text style={styles.appName}>RETINOVA</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>District</Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>District Screening Ledger</Text>
        <Text style={styles.headerSub}>{total} Total verified screenings recorded</Text>

        {/* Search Box */}
        <TextInput
          style={styles.searchInput}
          placeholder="Search by patient name, location, or screening ID..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        {/* Filters */}
        <View style={styles.filtersRow}>
          <FilterChip
            label="All"
            active={selectedGrade === undefined && selectedDecision === undefined}
            onPress={() => { setSelectedGrade(undefined); setSelectedDecision(undefined); }}
          />
          <FilterChip
            label="REFER Only"
            active={selectedDecision === 'REFER'}
            onPress={() => setSelectedDecision(selectedDecision === 'REFER' ? undefined : 'REFER')}
          />
          <FilterChip
            label="SCREEN Only"
            active={selectedDecision === 'SCREEN'}
            onPress={() => setSelectedDecision(selectedDecision === 'SCREEN' ? undefined : 'SCREEN')}
          />
          {[0, 1, 2, 3, 4].map(g => (
            <FilterChip
              key={g}
              label={GRADE_SHORT[g]}
              active={selectedGrade === g}
              onPress={() => setSelectedGrade(selectedGrade === g ? undefined : g)}
            />
          ))}
        </View>
      </View>

      {/* Screenings List */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={styles.loadingText}>Fetching screening records...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No screenings match your search and filter criteria.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 3 },
  appName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 2 },
  roleBadge: { backgroundColor: COLORS.accentLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.accent },
  roleBadgeText: { fontSize: 9.5, fontWeight: FONTS.weightBold, color: COLORS.accent },
  headerTitle: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 0.3 },
  headerSub: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 1, marginBottom: SPACING.sm },
  searchInput: {
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    fontSize: FONTS.sizeSM,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap' },
  listContent: { padding: SPACING.md, paddingBottom: 60 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  metaText: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 2 },
  cardDivider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: SPACING.sm },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gradeBadge: { flexDirection: 'row', alignItems: 'center' },
  gradeText: { fontSize: FONTS.sizeLG, fontWeight: FONTS.weightBold, color: COLORS.accent, marginRight: SPACING.xs },
  gradeSub: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary },
  riskLabel: { fontSize: FONTS.sizeXS, color: COLORS.textMuted },
  riskVal: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  loadingText: { marginTop: SPACING.md, fontSize: FONTS.sizeMD, color: COLORS.textSecondary },
  empty: { padding: SPACING.xxxl, alignItems: 'center' },
  emptyText: { fontSize: FONTS.sizeMD, color: COLORS.textMuted, textAlign: 'center' },
});
