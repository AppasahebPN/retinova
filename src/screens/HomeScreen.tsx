// ============================================================
// RETINOVA — ASHA / Primary Health Screener Home (Role 1)
// Field Mobile Workflow — Mobile-first design
// ============================================================
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Image, useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { screeningService } from '../services/screeningService';
import { analyticsService } from '../services/analyticsService';
import { Button, SectionHeader, EmptyState, StatusBadge, RoleHeader } from '../components';
import { COLORS, FONTS, SPACING, RADIUS, GRADE_SHORT } from '../utils/constants';
import type { Screening, AshaHomeStackParamList } from '../types';

type Nav = NativeStackNavigationProp<AshaHomeStackParamList, 'Home'>;

function decisionType(d?: string): 'screen' | 'refer' | 'recapture' | 'neutral' {
  if (d === 'SCREEN') return 'screen';
  if (d === 'REFER') return 'refer';
  if (d === 'RECAPTURE') return 'recapture';
  return 'neutral';
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  } catch { return iso; }
}

function StatBox({ label, value, color }: { label: string; value?: number | string; color?: string }) {
  return (
    <View style={[statStyles.box, color ? { borderTopColor: color, borderTopWidth: 3 } : null]}>
      <Text style={[statStyles.value, color ? { color } : null]}>{value ?? '--'}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}
const statStyles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginHorizontal: 3,
    minHeight: 74,
    justifyContent: 'center',
  },
  value: { fontSize: FONTS.size2XL, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  label: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, textAlign: 'center', marginTop: 3, lineHeight: 14 },
});

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<Nav>();
  const { width } = useWindowDimensions();
  const [recent, setRecent] = useState<Screening[]>([]);
  const [pendingFollowups, setPendingFollowups] = useState<Screening[]>([]);
  const [todayScreeningsCount, setTodayScreeningsCount] = useState(0);
  const [todayReferralsCount, setTodayReferralsCount] = useState(0);
  const [pendingFollowupsCount, setPendingFollowupsCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [, screeningsRes] = await Promise.allSettled([
        analyticsService.getOverview(),
        screeningService.list({ limit: 10 }),
      ]);

      if (screeningsRes.status === 'fulfilled') {
        const list = screeningsRes.value.screenings ?? [];
        setRecent(list.slice(0, 5));

        const todayStr = new Date().toISOString().slice(0, 10);
        const todayScreenings = list.filter(s => s.created_at?.startsWith(todayStr));
        const todayReferrals = list.filter(s => s.created_at?.startsWith(todayStr) && (s.referral || s.classification?.decision === 'REFER'));
        const pending = list.filter(s => s.referral && (!s.referral.action_taken || s.referral.action_taken === 'referral_pending'));

        setTodayScreeningsCount(todayScreenings.length);
        setTodayReferralsCount(todayReferrals.length);
        setPendingFollowupsCount(pending.length);
        setPendingFollowups(pending.slice(0, 3));
      }
    } catch (err) {
      console.warn('Failed to load ASHA home data:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.accent} />}
    >
      {/* Unified Institutional Top Header */}
      <RoleHeader
        title="Primary Health Eye Screening"
        subtitle="Field screening triage, patient registration & fundus evaluation"
        roleLabel="ASHA Screener"
        userName={user?.full_name}
        facilityName={user?.facility?.name || 'Bagalkot Rural Primary Health Center'}
        onLogout={logout}
      />

      <View style={styles.body}>
        {/* 1. Primary CTA — Start New Screening */}
        <View style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>Start New Screening</Text>
          <Text style={styles.ctaBody}>
            Search or register a patient, select eye, and capture a fundus image for immediate AI-assisted diabetic retinopathy triage.
          </Text>
          <Button
            title="＋  Start New Screening"
            onPress={() => navigation.navigate('PatientSearch')}
            fullWidth
          />
        </View>

        {/* 2. Today's Activity */}
        <SectionHeader title="Today's Activity" />
        <View style={styles.statsRow}>
          <StatBox label="Screenings" value={todayScreeningsCount} color={COLORS.accent} />
          <StatBox label="Referrals" value={todayReferralsCount} color={COLORS.decisionRefer} />
          <StatBox label="Pending Follow-ups" value={pendingFollowupsCount} color={COLORS.warning} />
        </View>

        {/* 3. Recent Patients */}
        <SectionHeader title="Recent Patients" />
        {recent.length === 0 ? (
          <EmptyState
            message="No screenings recorded yet. Tap Start New Screening to begin."
          />
        ) : (
          recent.map((s) => {
            const dt = decisionType(s.classification?.decision ?? (s.quality?.accepted === false ? 'RECAPTURE' : undefined));
            const grade = s.classification?.predicted_grade;
            return (
              <TouchableOpacity
                key={s.id}
                style={styles.recentItem}
                onPress={() => navigation.navigate('ScreeningResult', { screeningId: s.id })}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Screening for ${s.patient?.name ?? 'patient'}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentPatientName}>{s.patient?.name ?? 'Patient Record'}</Text>
                  <Text style={styles.recentMeta}>
                    {formatDate(s.created_at)}  ·  {s.eye?.toUpperCase()} Eye
                    {s.patient?.location ? `  ·  ${s.patient.location}` : ''}
                  </Text>
                  {grade !== undefined && (
                    <View style={styles.gradeTag}>
                      <Text style={styles.gradeTagText}>Grade: {GRADE_SHORT[grade]}</Text>
                    </View>
                  )}
                </View>
                <StatusBadge
                  label={s.classification?.decision === 'REFER' ? 'Refer' : s.classification?.decision === 'SCREEN' ? 'Screen' : (s.quality?.accepted === false ? 'Recapture' : 'Pending')}
                  type={dt}
                />
              </TouchableOpacity>
            );
          })
        )}

        {/* 4. Pending Follow-ups */}
        <SectionHeader title="Pending Follow-ups" />
        {pendingFollowups.length === 0 ? (
          <View style={styles.pendingEmptyBox}>
            <Text style={styles.pendingEmptyText}>All identified patient referrals have received initial guidance.</Text>
          </View>
        ) : (
          pendingFollowups.map((s) => (
            <TouchableOpacity
              key={`followup-${s.id}`}
              style={styles.followupCard}
              onPress={() => navigation.navigate('Referral' as any, { screeningId: s.id })}
              activeOpacity={0.7}
            >
              <View style={styles.followupTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.followupName}>{s.patient?.name || 'Patient Record'}</Text>
                  <Text style={styles.followupMeta}>
                    {s.patient?.location ? `${s.patient.location}  ·  ` : ''}{s.eye?.toUpperCase()} Eye  ·  {formatDate(s.created_at)}
                  </Text>
                </View>
                <StatusBadge label="Needs Advice" type="pending" />
              </View>
              <Text style={styles.followupReason} numberOfLines={2}>
                {s.referral?.reason || 'Referral recommended for specialist ophthalmologist review.'}
              </Text>
              <Text style={styles.followupPrompt}>Tap to record referral action →</Text>
            </TouchableOpacity>
          ))
        )}

        {/* Rural Field Context Banner */}
        <View style={styles.communityBanner}>
          <Image
            source={require('../../assets/community-screening.jpg')}
            style={styles.communityImg}
            resizeMode="cover"
            accessibilityLabel="ASHA worker performing community retinal screening with smartphone-based optical attachment"
          />
          <View style={styles.communityOverlay}>
            <Text style={styles.communityBannerTitle}>Community Retinal Screening</Text>
            <Text style={styles.communityBannerText}>
              Point-of-care fundus screening across primary health centers and rural outreach camps.
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 60 },
  body: { padding: SPACING.lg, maxWidth: 960, width: '100%', alignSelf: 'center' },

  // Header
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  appName: { fontSize: FONTS.sizeXL, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 2.5 },
  roleBadge: { backgroundColor: COLORS.accentLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.accent },
  roleBadgeText: { fontSize: 10, fontWeight: FONTS.weightBold, color: COLORS.accent, letterSpacing: 0.5 },
  appSubtitle: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 2 },
  logoutBtn: { paddingVertical: 7, paddingHorizontal: SPACING.md, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  logoutText: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, fontWeight: FONTS.weightSemiBold },

  // Worker info
  workerCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  workerName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  workerFacility: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, marginTop: 2 },

  // CTA
  ctaCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopColor: COLORS.accent,
    borderTopWidth: 3,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  ctaTitle: { fontSize: FONTS.sizeLG, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  ctaBody: { fontSize: FONTS.sizeSM, color: COLORS.textSecondary, marginBottom: SPACING.lg, lineHeight: 20 },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.lg },

  // Community Banner
  communityBanner: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 140,
  },
  communityImg: {
    width: '100%',
    height: 140,
  },
  communityOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  communityBannerTitle: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightBold, color: '#FFFFFF' },
  communityBannerText: { fontSize: FONTS.sizeXS, color: 'rgba(255,255,255,0.85)', marginTop: 2, lineHeight: 16 },

  // Recent screenings
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  recentPatientName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightSemiBold, color: COLORS.textPrimary },
  recentMeta: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 2 },
  gradeTag: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  gradeTagText: { fontSize: 11, fontWeight: FONTS.weightBold, color: COLORS.accent },

  // Pending follow-ups
  followupCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 3.5,
    borderLeftColor: COLORS.warning,
    marginBottom: SPACING.sm,
  },
  followupTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  followupName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  followupMeta: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 2 },
  followupReason: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, marginTop: SPACING.xs, lineHeight: 16 },
  followupPrompt: { fontSize: FONTS.sizeXS, color: COLORS.accent, fontWeight: FONTS.weightSemiBold, marginTop: SPACING.xs, textAlign: 'right' },
  pendingEmptyBox: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  pendingEmptyText: { fontSize: FONTS.sizeSM, color: COLORS.textMuted, textAlign: 'center' },
});

