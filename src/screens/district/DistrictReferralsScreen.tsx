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
import { FilterChip, StatusBadge } from '../../components';
import { COLORS, FONTS, SPACING, RADIUS, GRADE_SHORT } from '../../utils/constants';
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
            <Text style={styles.facilityName}>{item.facility?.name || 'Bagalkot Primary Center'}</Text>
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
          <View style={styles.metaBadge}>
            <Text style={styles.metaBadgeText}>
              Eye: {item.eye?.toUpperCase()}     Grade: {grade !== undefined ? GRADE_SHORT[grade] : '--'}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
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
          <Text style={styles.appName}>RETINOVA</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>District</Text>
          </View>
        </View>
        <Text style={styles.title}>District Referral Queue</Text>
        <Text style={styles.sub}>{screenings.length} total referrals across district facilities</Text>

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
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={styles.loadingText}>Fetching referral pipeline...</Text>
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
              <Text style={styles.emptyText}>No referrals currently in this category.</Text>
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
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 3 },
  appName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 2 },
  roleBadge: { backgroundColor: COLORS.accentLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.accent },
  roleBadgeText: { fontSize: 9.5, fontWeight: FONTS.weightBold, color: COLORS.accent },
  title: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 0.3 },
  sub: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 1, marginBottom: SPACING.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  listContent: { padding: SPACING.md, paddingBottom: 60 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  cardUrgent: { borderLeftWidth: 4, borderLeftColor: COLORS.error },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.xs },
  patientName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  facilityName: { fontSize: FONTS.sizeXS, color: COLORS.textMuted },
  reasonText: { fontSize: FONTS.sizeSM, color: COLORS.textSecondary, marginVertical: SPACING.xs, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.xs },
  metaBadge: { backgroundColor: COLORS.surfaceAlt, paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.sm },
  metaBadgeText: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, fontWeight: FONTS.weightMedium },
  dateText: { fontSize: FONTS.sizeXS, color: COLORS.textMuted },
  notesBox: {
    backgroundColor: COLORS.surfaceAlt,
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.accent,
  },
  notesLabel: { fontSize: 9, fontWeight: FONTS.weightBold, color: COLORS.accent },
  notesContent: { fontSize: FONTS.sizeXS, color: COLORS.textPrimary },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  loadingText: { marginTop: SPACING.md, fontSize: FONTS.sizeMD, color: COLORS.textSecondary },
  empty: { padding: SPACING.xxxl, alignItems: 'center' },
  emptyText: { fontSize: FONTS.sizeMD, color: COLORS.textMuted, textAlign: 'center' },
});
