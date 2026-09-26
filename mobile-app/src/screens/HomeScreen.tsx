// ============================================================
// RETINOVA — ASHA Worker Home Screen
// Figma Make Source of Truth — Polished Healthcare UI System
// ============================================================
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { screeningService } from '../services/screeningService';
import { analyticsService } from '../services/analyticsService';
import {
  SectionHeader,
  EmptyState,
  StatusBadge,
  RoleHeader,
  AvatarInitial,
  ProgressBar,
} from '../components';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  FONT_FAMILY,
  GRADE_SHORT,
} from '../utils/constants';
import type { Screening, AshaHomeStackParamList } from '../types';

type Nav = NativeStackNavigationProp<AshaHomeStackParamList, 'Home'>;

function decisionType(d?: string): 'screen' | 'refer' | 'recapture' | 'pending' | 'neutral' {
  if (d === 'SCREEN') return 'screen';
  if (d === 'REFER') return 'refer';
  if (d === 'RECAPTURE') return 'recapture';
  if (d === 'PENDING') return 'pending';
  return 'neutral';
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<Nav>();
  const [recent, setRecent] = useState<Screening[]>([]);
  const [pendingFollowups, setPendingFollowups] = useState<Screening[]>([]);
  const [todayScreeningsCount, setTodayScreeningsCount] = useState(0);
  const [todayReferralsCount, setTodayReferralsCount] = useState(0);
  const [thisWeekCount, setThisWeekCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [, screeningsRes] = await Promise.allSettled([
        analyticsService.getOverview(),
        screeningService.list({ limit: 15 }),
      ]);

      if (screeningsRes.status === 'fulfilled') {
        const list = screeningsRes.value.screenings ?? [];
        setRecent(list.slice(0, 5));

        const todayStr = new Date().toISOString().slice(0, 10);
        const todayScreenings = list.filter((s) => s.created_at?.startsWith(todayStr));
        const todayReferrals = list.filter(
          (s) =>
            s.created_at?.startsWith(todayStr) &&
            (s.referral || s.classification?.decision === 'REFER')
        );
        const pending = list.filter(
          (s) =>
            s.referral &&
            (!s.referral.action_taken || s.referral.action_taken === 'referral_pending')
        );

        setTodayScreeningsCount(todayScreenings.length);
        setTodayReferralsCount(todayReferrals.length);
        setThisWeekCount(list.length);
        setPendingFollowups(pending.slice(0, 3));
      }
    } catch (err) {
      console.warn('Failed to load ASHA home data:', err);
    } finally {
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

  const monthlyTarget = 40;
  const currentProgress = Math.min(monthlyTarget, Math.max(todayScreeningsCount, recent.length));
  const progressPercent = Math.round((currentProgress / monthlyTarget) * 100);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.teal800} />
      }
    >
      {/* Unified Institutional Top Header (Figma style) */}
      <RoleHeader
        title="Primary Health Eye Screening"
        subtitle="Field screening triage, patient registration & fundus evaluation"
        roleLabel="ASHA Worker"
        userName={user?.full_name}
        facilityName={user?.facility?.name || 'District Health Administration'}
        onLogout={logout}
      />

      <View style={styles.body}>
        {/* 1. Today's Summary (Figma 3-column stat grid) */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.teal800 }]}>
              {todayScreeningsCount}
            </Text>
            <Text style={styles.statLabel}>Today's Screenings</Text>
            <Text style={styles.statSub}>of 12 target</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.maroon700 }]}>
              {todayReferralsCount}
            </Text>
            <Text style={styles.statLabel}>Referred</Text>
            <Text style={styles.statSub}>urgent cases</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: COLORS.navy700 }]}>
              {thisWeekCount}
            </Text>
            <Text style={styles.statLabel}>This Week</Text>
            <Text style={styles.statSub}>total screened</Text>
          </View>
        </View>

        {/* 2. Primary Action — Find Patient (Figma large touch button) */}
        <TouchableOpacity
          style={styles.primaryCta}
          onPress={() => navigation.navigate('PatientSearch')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Find Patient"
        >
          <View style={styles.primaryCtaIconWrap}>
            <Text style={styles.primaryCtaIcon}>🔍</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.primaryCtaTitle}>Find Patient</Text>
            <Text style={styles.primaryCtaSubtitle}>Search or register for screening</Text>
          </View>
          <Text style={styles.primaryCtaChevron}>→</Text>
        </TouchableOpacity>

        {/* 3. Secondary Action — Register New Patient (Figma secondary action card) */}
        <TouchableOpacity
          style={styles.secondaryCta}
          onPress={() => navigation.navigate('NewPatient')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Register New Patient"
        >
          <View style={styles.secondaryCtaIconWrap}>
            <Text style={styles.secondaryCtaIcon}>＋</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.secondaryCtaTitle}>Register New Patient</Text>
            <Text style={styles.secondaryCtaSubtitle}>Add a new patient to the programme</Text>
          </View>
          <Text style={styles.secondaryCtaChevron}>→</Text>
        </TouchableOpacity>

        {/* 4. Recent Patients (Figma card with avatar circles) */}
        <SectionHeader title="Recent Patients" />
        {recent.length === 0 ? (
          <EmptyState message="No screenings recorded yet. Tap Find Patient to begin." />
        ) : (
          <View style={styles.patientCardContainer}>
            {recent.map((s, idx) => {
              const dt = decisionType(
                s.classification?.decision ??
                  (s.quality?.accepted === false ? 'RECAPTURE' : undefined)
              );
              const grade = s.classification?.predicted_grade;
              const patientName = s.patient?.name ?? 'Patient Record';
              const location =
                s.patient?.location || (s.patient as any)?.village || 'Primary Center';
              const isLast = idx === recent.length - 1;

              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.patientRow, !isLast && styles.patientRowBorder]}
                  onPress={() => navigation.navigate('ScreeningResult', { screeningId: s.id })}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={`Screening for ${patientName}`}
                >
                  <AvatarInitial name={patientName} size={40} />
                  <View style={styles.patientInfo}>
                    <Text style={styles.patientName}>{patientName}</Text>
                    <Text style={styles.patientMeta}>
                      {s.patient?.age ? `${s.patient.age} yrs · ` : ''}
                      {s.patient?.gender ? `${s.patient.gender} · ` : ''}
                      {location}
                    </Text>
                    <Text style={styles.patientDate}>
                      {s.eye ? `${s.eye.toUpperCase()} Eye · ` : ''}
                      {formatDate(s.created_at)}
                    </Text>
                  </View>
                  <View style={styles.patientStatusWrap}>
                    <StatusBadge
                      label={
                        s.classification?.decision === 'REFER'
                          ? 'Refer'
                          : s.classification?.decision === 'SCREEN'
                          ? 'Screen'
                          : s.quality?.accepted === false
                          ? 'Recapture'
                          : 'Pending'
                      }
                      type={dt}
                    />
                    {grade !== undefined && (
                      <Text style={styles.gradeTextSmall}>{GRADE_SHORT[grade]}</Text>
                    )}
                  </View>
                  <Text style={styles.rowChevron}>›</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 5. Monthly Target Progress (Figma progress bar) */}
        <View style={styles.targetSection}>
          <View style={styles.targetHeader}>
            <Text style={styles.targetSectionLabel}>MONTHLY TARGET PROGRESS</Text>
            <Text style={styles.targetCount}>
              {currentProgress} / {monthlyTarget}
            </Text>
          </View>
          <View style={styles.targetCard}>
            <ProgressBar progress={progressPercent} />
            <View style={styles.targetMetaRow}>
              <Text style={styles.targetMetaText}>{progressPercent}% complete</Text>
              <Text style={styles.targetMetaText}>
                {Math.max(0, monthlyTarget - currentProgress)} more to reach target
              </Text>
            </View>
          </View>
        </View>

        {/* 6. Pending Follow-ups */}
        {pendingFollowups.length > 0 && (
          <View style={{ marginTop: SPACING.md }}>
            <SectionHeader title="Pending Follow-ups" />
            {pendingFollowups.map((s) => (
              <TouchableOpacity
                key={`followup-${s.id}`}
                style={styles.followupCard}
                onPress={() => navigation.navigate('Referral' as any, { screeningId: s.id })}
                activeOpacity={0.75}
              >
                <View style={styles.followupTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.followupName}>{s.patient?.name || 'Patient Record'}</Text>
                    <Text style={styles.followupMeta}>
                      {s.patient?.location ? `${s.patient.location} · ` : ''}
                      {s.eye?.toUpperCase()} Eye · {formatDate(s.created_at)}
                    </Text>
                  </View>
                  <StatusBadge label="Needs Advice" type="pending" />
                </View>
                <Text style={styles.followupReason} numberOfLines={2}>
                  {s.referral?.reason || 'Referral recommended for specialist ophthalmologist review.'}
                </Text>
                <Text style={styles.followupPrompt}>Tap to record referral action →</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 7. Rural Field Context Banner */}
        <View style={styles.communityBanner}>
          <Image
            source={require('../../assets/community-screening.jpg')}
            style={styles.communityImg}
            resizeMode="cover"
            accessibilityLabel="Community retinal screening"
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
  body: { padding: SPACING.lg, maxWidth: 840, width: '100%', alignSelf: 'center' },

  // 3-column stats
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  statValue: {
    fontFamily: FONT_FAMILY.display,
    fontSize: 26,
    fontWeight: FONTS.weightBold,
    lineHeight: 30,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: FONTS.weightBold,
    color: COLORS.slate500,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.body,
  },
  statSub: {
    fontSize: 11,
    color: COLORS.slate400,
    marginTop: 2,
    textAlign: 'center',
    fontFamily: FONT_FAMILY.body,
  },

  // Primary Action
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.teal800,
    borderRadius: RADIUS.lg,
    padding: 16,
    gap: 14,
    marginBottom: 12,
    shadowColor: '#0D5E5E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryCtaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaIcon: { fontSize: 20 },
  primaryCtaTitle: {
    fontSize: 16,
    fontWeight: FONTS.weightBold,
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.body,
  },
  primaryCtaSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontFamily: FONT_FAMILY.body,
  },
  primaryCtaChevron: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: FONTS.weightBold,
    paddingRight: 4,
  },

  // Secondary Action
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    padding: 14,
    gap: 14,
    marginBottom: SPACING.xl,
    ...SHADOWS.card,
  },
  secondaryCtaIconWrap: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.teal50,
    borderWidth: 1,
    borderColor: COLORS.teal100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCtaIcon: {
    fontSize: 20,
    fontWeight: FONTS.weightBold,
    color: COLORS.teal800,
  },
  secondaryCtaTitle: {
    fontSize: 15,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    fontFamily: FONT_FAMILY.body,
  },
  secondaryCtaSubtitle: {
    fontSize: 13,
    color: COLORS.slate500,
    marginTop: 2,
    fontFamily: FONT_FAMILY.body,
  },
  secondaryCtaChevron: {
    fontSize: 18,
    color: COLORS.slate400,
    paddingRight: 4,
  },

  // Recent patients list
  patientCardContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  patientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  patientRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  patientInfo: { flex: 1 },
  patientName: {
    fontSize: 14,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    fontFamily: FONT_FAMILY.body,
  },
  patientMeta: {
    fontSize: 12,
    color: COLORS.slate500,
    marginTop: 2,
    fontFamily: FONT_FAMILY.body,
  },
  patientDate: {
    fontSize: 11,
    color: COLORS.slate400,
    marginTop: 2,
    fontFamily: FONT_FAMILY.body,
  },
  patientStatusWrap: {
    alignItems: 'flex-end',
    gap: 4,
  },
  gradeTextSmall: {
    fontSize: 10,
    fontWeight: FONTS.weightBold,
    color: COLORS.teal800,
    fontFamily: FONT_FAMILY.mono,
  },
  rowChevron: {
    fontSize: 20,
    color: COLORS.slate400,
    paddingLeft: 4,
  },

  // Monthly Target
  targetSection: {
    marginBottom: SPACING.xl,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  targetSectionLabel: {
    fontSize: 10,
    fontWeight: FONTS.weightBold,
    color: COLORS.slate500,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    fontFamily: FONT_FAMILY.body,
  },
  targetCount: {
    fontSize: 12,
    fontWeight: FONTS.weightBold,
    color: COLORS.teal800,
    fontFamily: FONT_FAMILY.body,
  },
  targetCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 16,
    ...SHADOWS.card,
  },
  targetMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  targetMetaText: {
    fontSize: 12,
    color: COLORS.slate500,
    fontFamily: FONT_FAMILY.body,
  },

  // Follow-ups
  followupCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderLeftWidth: 3.5,
    borderLeftColor: COLORS.amber600,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  followupTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  followupName: {
    fontSize: FONTS.sizeMD,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    fontFamily: FONT_FAMILY.body,
  },
  followupMeta: {
    fontSize: FONTS.sizeXS,
    color: COLORS.slate500,
    marginTop: 2,
    fontFamily: FONT_FAMILY.body,
  },
  followupReason: {
    fontSize: FONTS.sizeSM,
    color: COLORS.slate700,
    lineHeight: 18,
    marginVertical: SPACING.xs,
    fontFamily: FONT_FAMILY.body,
  },
  followupPrompt: {
    fontSize: FONTS.sizeXS,
    color: COLORS.teal800,
    fontWeight: FONTS.weightSemiBold,
    marginTop: 4,
    fontFamily: FONT_FAMILY.body,
  },

  // Community Banner
  communityBanner: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginTop: SPACING.lg,
    position: 'relative',
    height: 140,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    ...SHADOWS.card,
  },
  communityImg: { width: '100%', height: '100%' },
  communityOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15,30,54,0.78)',
    padding: SPACING.md,
  },
  communityBannerTitle: {
    fontSize: FONTS.sizeMD,
    fontWeight: FONTS.weightBold,
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.display,
  },
  communityBannerText: {
    fontSize: FONTS.sizeXS,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.body,
  },
});
