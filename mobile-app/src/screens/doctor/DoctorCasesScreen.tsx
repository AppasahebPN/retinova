// ============================================================
// RETINOVA — Doctor Case Ledger (Role 3)
// Comprehensive Patient Cases Ledger for Specialist Search
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { screeningService } from '../../services/screeningService';
import { StatusBadge, FilterChip, GradeBadge, RetinovaLogo, RoleBadge } from '../../components';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, FONT_FAMILY, GRADE_SHORT } from '../../utils/constants';
import type { Screening } from '../../types';

export default function DoctorCasesScreen() {
  const navigation = useNavigation<any>();
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState<number | undefined>(undefined);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await screeningService.list({
        grade: gradeFilter,
        limit: 50,
      });
      setScreenings(res.screenings || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.warn('Failed to load doctor cases:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [gradeFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCases();
  };

  const filtered = screenings.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const pName = s.patient?.name?.toLowerCase() || '';
    const sId = s.id.toLowerCase();
    const loc = s.patient?.location?.toLowerCase() || '';
    return pName.includes(q) || sId.includes(q) || loc.includes(q);
  });

  const renderItem = ({ item }: { item: Screening }) => {
    const grade = item.classification?.predicted_grade;
    const isRefer = item.classification?.decision === 'REFER';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('DoctorClinicalReview', { screeningId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{item.patient?.name || 'Patient Case'}</Text>
            <Text style={styles.cardMeta}>
              Eye: {item.eye?.toUpperCase()} · {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {item.facility?.name || 'Primary Center'}
            </Text>
            <Text style={styles.screeningId}>ID: {item.id}</Text>
          </View>
          <StatusBadge
            label={isRefer ? 'Refer' : 'Screen'}
            type={isRefer ? 'refer' : 'screen'}
          />
        </View>

        <View style={styles.cardBottom}>
          {grade !== undefined ? (
            <GradeBadge grade={grade} size="small" />
          ) : (
            <Text style={styles.pendingGrade}>Awaiting Grade</Text>
          )}
          <Text style={styles.inspectLink}>Review Case →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <RetinovaLogo size="sm" />
          <RoleBadge role="Ophthalmologist" />
        </View>
        <Text style={styles.title}>Patient Case Directory</Text>
        <Text style={styles.sub}>{total} total ophthalmic screening cases across facilities</Text>

        <TextInput
          style={styles.search}
          placeholder="Search patient name, ID, or village..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />

        <View style={styles.filtersRow}>
          <FilterChip
            label="All Grades"
            active={gradeFilter === undefined}
            onPress={() => setGradeFilter(undefined)}
          />
          {[0, 1, 2, 3, 4].map((g) => (
            <FilterChip
              key={g}
              label={GRADE_SHORT[g]}
              active={gradeFilter === g}
              onPress={() => setGradeFilter(gradeFilter === g ? undefined : g)}
            />
          ))}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Loading cases...</Text>
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
              <Text style={styles.emptyText}>No patient cases match query.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topHeader: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.card,
  },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  title: { fontSize: 24, fontFamily: FONT_FAMILY.display, color: COLORS.navy900, letterSpacing: 0.3 },
  sub: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 1, marginBottom: SPACING.sm },
  search: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 9,
    fontSize: FONTS.sizeSM,
    color: COLORS.navy900,
    marginBottom: SPACING.sm,
  },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  listContent: { padding: SPACING.md, paddingBottom: 60 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.navy900 },
  cardMeta: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 2 },
  screeningId: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONT_FAMILY.mono, marginTop: 2 },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  pendingGrade: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, fontStyle: 'italic' },
  inspectLink: { fontSize: FONTS.sizeXS, color: COLORS.primary, fontWeight: FONTS.weightBold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  loadingText: { marginTop: SPACING.md, fontSize: FONTS.sizeMD, color: COLORS.textSecondary },
  empty: { padding: SPACING.xxxl, alignItems: 'center' },
  emptyText: { fontSize: FONTS.sizeMD, color: COLORS.textMuted, textAlign: 'center' },
});
