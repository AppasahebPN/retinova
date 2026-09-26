// ============================================================
// RETINOVA — District Referrals Queue (Role 2)
// Real-time Referral Lifecycle Monitoring
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { referralService } from '../../services/referralService';
import { FilterChip, StatusBadge, RetinovaLogo, RoleBadge, GradeBadge } from '../../components';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, FONT_FAMILY, GRADE_SHORT } from '../../utils/constants';
import type { Screening } from '../../types';

export default function DistrictReferralsScreen() {
  const navigation = useNavigation<any>();
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'urgent'>('all');

  const fetchReferrals = async () => {
    try {
      setLoading(true);
      if (__DEV__) console.log('[BOOT API]', { method: 'GET', url: '/api/screenings (district referrals)' });
      const res = await referralService.listReferrals({ limit: 100 });
      // Filter screenings that have a referral record
      const list = (res.screenings || []).filter(s => !!s.referral);
      setScreenings(list);
    } catch (err: any) {
      const msg = err.message || 'Unable to load district referrals.';
      if (__DEV__) console.error('[BOOT API ERROR]', { url: '/api/screenings', status: 'unknown', message: msg });
      console.warn('Failed to load district referrals:', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReferrals();
  };

  const filtered = screenings.filter(s => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'urgent') return s.referral?.priority === 'urgent' || s.referral?.priority === 'priority';
    if (statusFilter === 'completed') return s.referral?.action_taken === 'referral_completed' || s.referral?.action_taken === 'patient_advised';
    if (statusFilter === 'pending') return !s.referral?.action_taken || s.referral?.action_taken === 'referral_pending';
    return true;
  });

  const pendingCount = screenings.filter(s => !s.referral?.action_taken || s.referral?.action_taken === 'referral_pending').length;
  const completedCount = screenings.filter(s => s.referral?.action_taken === 'referral_completed' || s.referral?.action_taken === 'patient_advised').length;
  const urgentCount = screenings.filter(s => s.referral?.priority === 'urgent' || s.referral?.priority === 'priority').length;

  const renderItem = ({ item }: { item: Screening }) => {
    const ref = item.referral;
    const isUrgent = ref?.priority === 'urgent' || ref?.priority === 'priority';
    const isCompleted = ref?.action_taken === 'referral_completed' || ref?.action_taken === 'patient_advised';
    const grade = item.classification?.predicted_grade;

    return (
      <TouchableOpacity
        style={[styles.card, isUrgent && styles.cardUrgent]}
        onPress={() => navigation.navigate('SharedScreeningDetail', { screeningId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{item.patient?.name || 'Patient'}</Text>
            <Text style={styles.facilityName}>{item.facility?.name || 'Primary Health Center'}</Text>
            <Text style={styles.screeningId}>ID: {item.id}</Text>
          </View>
          <StatusBadge
            label={isCompleted ? 'COMPLETED' : isUrgent ? 'URGENT' : 'PENDING'}
            type={isCompleted ? 'screen' : isUrgent ? 'urgent' : 'pending'}
          />
        </View>

        <Text style={styles.reasonText} numberOfLines={2}>
          {ref?.reason || 'Referable Diabetic Retinopathy detected. Specialist clinical review required.'}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.gradeBox}>
            {grade !== undefined ? (
              <GradeBadge grade={grade} size="small" />
            ) : (
              <Text style={styles.metaBadgeText}>Eye: {item.eye?.toUpperCase()}</Text>
            )}
            <Text style={styles.metaEyeText}>Eye: {item.eye?.toUpperCase()}</Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>

        {ref?.action_notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Reviewer Notes:</Text>
            <Text style={styles.notesContent} numberOfLines={2}>{ref.action_notes}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBanner}>
        <View style={styles.brandRow}>
          <RetinovaLogo size="sm" />
          <RoleBadge role="District Manager" />
        </View>
        <Text style={styles.title}>District Referral Queue</Text>
        <Text style={styles.sub}>{screenings.length} total referrals across district health network</Text>

        <View style={styles.chipRow}>
          <FilterChip
            label="All Referrals"
            active={statusFilter === 'all'}
            onPress={() => setStatusFilter('all')}
            count={screenings.length}
          />
          <FilterChip
            label="Pending Review"
            active={statusFilter === 'pending'}
            onPress={() => setStatusFilter('pending')}
            count={pendingCount}
          />
          <FilterChip
            label="Urgent Priority"
            active={statusFilter === 'urgent'}
            onPress={() => setStatusFilter('urgent')}
            count={urgentCount}
          />
          <FilterChip
            label="Completed"
            active={statusFilter === 'completed'}
            onPress={() => setStatusFilter('completed')}
            count={completedCount}
          />
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
          <Text style={styles.loadingText}>Fetching referral records...</Text>
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
              <Text style={styles.emptyText}>No referrals matching current filter.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  topBanner: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.card,
  },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  title: { fontSize: 24, fontFamily: FONT_FAMILY.display, color: COLORS.navy900, letterSpacing: 0.3 },
  sub: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 1, marginBottom: SPACING.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  listContent: { padding: SPACING.md, paddingBottom: 60 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.teal700,
    ...SHADOWS.card,
  },
  cardUrgent: {
    borderColor: COLORS.maroon200,
    borderLeftColor: COLORS.maroon900,
    backgroundColor: COLORS.surface,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.navy900 },
  facilityName: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 2 },
  screeningId: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONT_FAMILY.mono, marginTop: 2 },
  reasonText: { fontSize: FONTS.sizeSM, color: COLORS.navy800, marginVertical: SPACING.sm, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gradeBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  metaBadgeText: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary },
  metaEyeText: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginLeft: 4 },
  dateText: { fontSize: FONTS.sizeXS, color: COLORS.textMuted },
  notesBox: {
    backgroundColor: COLORS.teal50,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  notesLabel: { fontSize: 10, fontWeight: FONTS.weightBold, color: COLORS.primary, marginBottom: 2 },
  notesContent: { fontSize: FONTS.sizeXS, color: COLORS.navy900, lineHeight: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  loadingText: { marginTop: SPACING.md, fontSize: FONTS.sizeMD, color: COLORS.textSecondary },
  empty: { padding: SPACING.xxxl, alignItems: 'center' },
  emptyText: { fontSize: FONTS.sizeMD, color: COLORS.textMuted, textAlign: 'center' },
});
