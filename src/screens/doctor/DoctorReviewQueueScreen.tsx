// ============================================================
// RETINOVA — Reviewing Ophthalmologist Queue (Role 3)
// Specialist Review Queue: New, High-Priority, Pending, Reviewed
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { referralService } from '../../services/referralService';
import { RoleHeader, FilterChip, StatusBadge } from '../../components';
import { COLORS, FONTS, SPACING, RADIUS, GRADE_SHORT } from '../../utils/constants';
import type { Screening } from '../../types';

type QueueFilter = 'all' | 'high_priority' | 'pending' | 'reviewed';

export default function DoctorReviewQueueScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<QueueFilter>('all');
  const [fetchError, setFetchError] = useState('');

  const fetchQueue = async () => {
    try {
      setFetchError('');
      setLoading(true);
      if (__DEV__) console.log('[BOOT API]', { method: 'GET', url: '/api/screenings (doctor review queue)' });
      const res = await referralService.listReferrals({ limit: 100 });
      // Filter screenings with referrals or referable grade >= 1
      const list = (res.screenings || []).filter(s => {
        return !!s.referral || (s.classification?.predicted_grade !== undefined && s.classification.predicted_grade > 0);
      });
      setScreenings(list);
    } catch (err: any) {
      const msg = err.message || 'Unable to load doctor review queue.';
      if (__DEV__) console.error('[BOOT API ERROR]', { url: '/api/screenings', status: 'unknown', message: msg });
      setFetchError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchQueue();
  };

  const filtered = screenings.filter(s => {
    const isReviewed = s.referral?.action_taken === 'referral_completed' || s.referral?.action_taken === 'patient_advised';
    const isHighPriority = s.referral?.priority === 'urgent' || s.referral?.priority === 'priority' || (s.classification?.predicted_grade ?? 0) >= 3;

    if (activeFilter === 'high_priority') return isHighPriority;
    if (activeFilter === 'pending') return !isReviewed;
    if (activeFilter === 'reviewed') return isReviewed;
    return true;
  });

  const highPriorityCount = screenings.filter(s => s.referral?.priority === 'urgent' || s.referral?.priority === 'priority' || (s.classification?.predicted_grade ?? 0) >= 3).length;
  const pendingCount = screenings.filter(s => !(s.referral?.action_taken === 'referral_completed' || s.referral?.action_taken === 'patient_advised')).length;
  const reviewedCount = screenings.filter(s => s.referral?.action_taken === 'referral_completed' || s.referral?.action_taken === 'patient_advised').length;

  const renderItem = ({ item }: { item: Screening }) => {
    const grade = item.classification?.predicted_grade;
    const risk = item.classification?.g2plus_probability_calibrated;
    const isReviewed = item.referral?.action_taken === 'referral_completed' || item.referral?.action_taken === 'patient_advised';
    const isHighPriority = item.referral?.priority === 'urgent' || item.referral?.priority === 'priority' || (grade ?? 0) >= 3;

    return (
      <TouchableOpacity
        style={[styles.caseCard, isHighPriority && styles.caseCardUrgent]}
        onPress={() => navigation.navigate('DoctorClinicalReview', { screeningId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.caseTop}>
          <View style={{ flex: 1 }}>
            <View style={styles.patientRow}>
              <Text style={styles.patientName}>{item.patient?.name || 'Patient Record'}</Text>
              {item.patient?.age ? (
                <Text style={styles.patientAge}>({item.patient.age}y, {item.patient.gender})</Text>
              ) : null}
            </View>
            <Text style={styles.metaRow}>
              Facility: <Text style={{ fontWeight: FONTS.weightMedium, color: COLORS.textPrimary }}>{item.facility?.name || 'Community PHC'}</Text>     Eye: <Text style={{ fontWeight: FONTS.weightBold }}>{item.eye?.toUpperCase()}</Text>
            </Text>
            <Text style={styles.metaDate}>
              Screened: {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <StatusBadge
              label={isReviewed ? 'Reviewed' : isHighPriority ? 'High Priority' : 'Pending Review'}
              type={isReviewed ? 'screen' : isHighPriority ? 'urgent' : 'pending'}
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.caseDetails}>
          <View style={styles.gradeBox}>
            <Text style={styles.gradeText}>{grade !== undefined ? GRADE_SHORT[grade] : '--'}</Text>
            <View style={{ marginLeft: SPACING.xs }}>
              <Text style={styles.gradeTitle}>
                {grade !== undefined ? (grade === 0 ? 'No DR' : grade === 1 ? 'Mild DR' : grade === 2 ? 'Moderate' : grade === 3 ? 'Severe' : 'Proliferative') : 'Unclassified'}
              </Text>
              {risk !== undefined && (
                <Text style={styles.riskText}>Risk: {(risk * 100).toFixed(1)}%</Text>
              )}
            </View>
          </View>

          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={styles.reasonLabel}>Referral Reason:</Text>
            <Text style={styles.reasonText} numberOfLines={2}>
              {item.referral?.reason || 'Referable Diabetic Retinopathy detected. Clinical review recommended.'}
            </Text>
          </View>
        </View>

        <View style={styles.caseFooter}>
          <Text style={styles.clickPrompt}>Open Clinical Review →</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <RoleHeader
        title="Ophthalmologist Specialist Review Queue"
        subtitle="Review referred diabetic retinopathy screening cases and record clinical disposition"
        roleLabel="Ophthalmologist"
        userName={user?.full_name}
        facilityName="District Ophthalmology Center"
        onLogout={logout}
      />

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBarScroll}
        contentContainerStyle={styles.filterBarContent}
      >
        <FilterChip label="All Cases" active={activeFilter === 'all'} onPress={() => setActiveFilter('all')} count={screenings.length} />
        <FilterChip label="High-Priority (G3/G4)" active={activeFilter === 'high_priority'} onPress={() => setActiveFilter('high_priority')} count={highPriorityCount} />
        <FilterChip label="Pending Review" active={activeFilter === 'pending'} onPress={() => setActiveFilter('pending')} count={pendingCount} />
        <FilterChip label="Reviewed" active={activeFilter === 'reviewed'} onPress={() => setActiveFilter('reviewed')} count={reviewedCount} />
      </ScrollView>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={styles.loadingText}>Loading specialist review queue...</Text>
        </View>
      ) : fetchError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{fetchError}</Text>
          <TouchableOpacity onPress={fetchQueue} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
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
              <Text style={styles.emptyText}>No cases currently matching this queue filter.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  filterBarScroll: {
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    maxHeight: 56,
  },
  filterBarContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: 0,
  },
  listContent: { padding: SPACING.lg, paddingBottom: 60, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  caseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  caseCardUrgent: { borderLeftWidth: 4, borderLeftColor: COLORS.error },
  caseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientRow: { flexDirection: 'row', alignItems: 'center' },
  patientName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  patientAge: { fontSize: FONTS.sizeSM, color: COLORS.textMuted, marginLeft: SPACING.xs },
  metaRow: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, marginTop: 2 },
  metaDate: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 1 },
  divider: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: SPACING.sm },
  caseDetails: { flexDirection: 'row', alignItems: 'flex-start' },
  gradeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  gradeText: { fontSize: FONTS.sizeXL, fontWeight: FONTS.weightBold, color: COLORS.accent },
  gradeTitle: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  riskText: { fontSize: 10, color: COLORS.textMuted },
  reasonLabel: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, fontWeight: FONTS.weightMedium },
  reasonText: { fontSize: FONTS.sizeXS, color: COLORS.textPrimary, marginTop: 1, lineHeight: 16 },
  caseFooter: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  clickPrompt: { fontSize: FONTS.sizeXS, color: COLORS.accent, fontWeight: FONTS.weightSemiBold, textAlign: 'right' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  loadingText: { marginTop: SPACING.md, fontSize: FONTS.sizeMD, color: COLORS.textSecondary },
  errorText: { fontSize: FONTS.sizeMD, color: COLORS.error, textAlign: 'center', marginBottom: SPACING.md },
  retryBtn: { paddingVertical: 10, paddingHorizontal: SPACING.xl, backgroundColor: COLORS.accent, borderRadius: RADIUS.sm },
  retryText: { color: '#fff', fontWeight: FONTS.weightBold, fontSize: FONTS.sizeSM },
  empty: { padding: SPACING.xxxl, alignItems: 'center' },
  emptyText: { fontSize: FONTS.sizeMD, color: COLORS.textMuted, textAlign: 'center' },
});
