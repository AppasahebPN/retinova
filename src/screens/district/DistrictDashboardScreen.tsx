// ============================================================
// RETINOVA — District Screening & Referral Dashboard (Role 2)
// Command Center for District Health Officer
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { analyticsService } from '../../services/analyticsService';
import { StatCard, SectionHeader, StatusBadge, RoleHeader } from '../../components';
import { COLORS, FONTS, SPACING, RADIUS } from '../../utils/constants';
import type { AnalyticsOverview } from '../../types';

export default function DistrictDashboardScreen() {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setError('');
      if (__DEV__) console.log('[BOOT API]', { method: 'GET', url: '/api/analytics/overview (district dashboard)' });
      const data = await analyticsService.getOverview();
      setAnalytics(data);
    } catch (err: any) {
      const msg = err.message || 'Unable to load district analytics.';
      if (__DEV__) console.error('[BOOT API ERROR]', { url: '/api/analytics/overview', status: 'unknown', message: msg });
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.accent} size="large" />
        <Text style={styles.loadingText}>Loading District Command Center...</Text>
      </View>
    );
  }

  const kpis = analytics?.kpis;
  const quality = analytics?.qualityStatistics;
  const facilities = analytics?.facilities || [];
  const severity = analytics?.severityDistribution || [];
  const referralStats = analytics?.referralStatistics || [];
  const volume = analytics?.volumeHistory || [];

  // Derived metrics
  const totalScreened = kpis?.totalScreenings ?? 0;
  const totalEyes = totalScreened;
  const referableCases = kpis?.referableCases ?? 0;
  const screenDecisions = Math.max(0, totalScreened - referableCases);
  const referDecisions = referableCases;
  const referableRate = totalScreened > 0 ? ((referableCases / totalScreened) * 100).toFixed(1) : '0.0';
  const acceptanceRate = kpis?.acceptanceRate ?? 94.2;
  const rejectionRate = quality?.rejectionRate ?? 5.8;

  // Screening volume aggregates
  const todayVolume = volume[volume.length - 1]?.screened ?? 0;
  const weekVolume = volume.slice(-7).reduce((acc, v) => acc + (v.screened || 0), 0);
  const monthVolume = volume.reduce((acc, v) => acc + (v.screened || 0), 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Institutional Top Header */}
      <RoleHeader
        title="District Screening & Referral Dashboard"
        subtitle="Operational command center, screening coverage, referral monitoring & capacity planning"
        roleLabel="District Health Operations"
        userName={user?.full_name}
        facilityName="District Health Administration, Bagalkot"
        onLogout={logout}
      />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchDashboard} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Summary KPI Grid */}
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>Program Summary Metrics</Text>
        <View style={styles.kpiGrid}>
          <StatCard
            label="Total Patients"
            value={kpis?.patientsScreened ?? 0}
            subtitle="Unique registered patients"
            color={COLORS.accent}
          />
          <StatCard
            label="Eyes Screened"
            value={totalEyes}
            subtitle="Retinal evaluations"
            color={COLORS.info}
          />
          <StatCard
            label="SCREEN Decisions"
            value={screenDecisions}
            subtitle="Routine annual follow-up"
            color={COLORS.decisionScreen}
          />
          <StatCard
            label="REFER Decisions"
            value={referDecisions}
            subtitle="Referral recommended"
            color={COLORS.decisionRefer}
          />
          <StatCard
            label="Referable Rate"
            value={`${referableRate}%`}
            subtitle="Grade 1-4 proportion"
            badge="Clinical"
            badgeType="info"
          />
          <StatCard
            label="Image Acceptance"
            value={`${acceptanceRate}%`}
            subtitle={`${rejectionRate}% recapture rate`}
            color={COLORS.accentDark}
          />
        </View>
      </View>

      {/* Screening Activity (Today, Week, Month) */}
      <View style={styles.sectionWrap}>
        <Text style={styles.sectionTitle}>Screening Activity Overview</Text>
        <View style={styles.activityRow}>
          <View style={styles.activityCard}>
            <Text style={styles.activityTime}>Today</Text>
            <Text style={styles.activityValue}>{todayVolume}</Text>
            <Text style={styles.activitySub}>Screenings conducted</Text>
          </View>
          <View style={styles.activityCard}>
            <Text style={styles.activityTime}>This Week (7 Days)</Text>
            <Text style={styles.activityValue}>{weekVolume}</Text>
            <Text style={styles.activitySub}>Total screenings</Text>
          </View>
          <View style={styles.activityCard}>
            <Text style={styles.activityTime}>Last 14 Days</Text>
            <Text style={styles.activityValue}>{monthVolume}</Text>
            <Text style={styles.activitySub}>Cumulative volume</Text>
          </View>
        </View>
      </View>

      {/* Two Column Layout: Facility Performance & Referral Status */}
      <View style={[styles.twoCol, isDesktop && styles.twoColDesktop]}>
        {/* Facility Performance */}
        <View style={styles.col}>
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Facility Performance</Text>
              <Text style={styles.panelBadge}>{facilities.length} Active Centers</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 2 }]}>Facility</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Cameras</Text>
              <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Status</Text>
            </View>
            {facilities.map((f, idx) => (
              <View key={f.id || idx} style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.tdMain}>{f.name}</Text>
                  <Text style={styles.tdSub}>{f.location || 'Bagalkot District'}</Text>
                </View>
                <Text style={[styles.tdMain, { flex: 1, textAlign: 'center' }]}>
                  {f.cameras || 1}
                </Text>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <StatusBadge label="Active" type="screen" />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* DR Severity & Referral Distribution */}
        <View style={styles.col}>
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Diabetic Retinopathy Severity</Text>
              <Text style={styles.panelBadge}>Grade 0-4</Text>
            </View>
            {severity.map((s) => (
              <View key={s.grade} style={styles.severityRow}>
                <View style={[styles.colorBar, { backgroundColor: s.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.severityName}>{s.label}</Text>
                </View>
                <Text style={styles.severityCount}>{s.count} cases</Text>
                <Text style={styles.severityPct}>({s.percentage}%)</Text>
              </View>
            ))}
          </View>

          {/* Image Quality Gate Audit */}
          <View style={[styles.panel, { marginTop: SPACING.md }]}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Image Quality Audit</Text>
              <Text style={styles.panelBadge}>EyeQ IQA Gate</Text>
            </View>
            <View style={styles.qualityGrid}>
              <View style={styles.qualityItem}>
                <Text style={styles.qualityLabel}>Accepted Images</Text>
                <Text style={[styles.qualityVal, { color: COLORS.success }]}>{quality?.accepted ?? 0}</Text>
              </View>
              <View style={styles.qualityItem}>
                <Text style={styles.qualityLabel}>Rejected Images</Text>
                <Text style={[styles.qualityVal, { color: COLORS.error }]}>{quality?.rejected ?? 0}</Text>
              </View>
              <View style={styles.qualityItem}>
                <Text style={styles.qualityLabel}>Avg Quality Score</Text>
                <Text style={styles.qualityVal}>{quality?.averageQualityScore ?? 89.4} / 100</Text>
              </View>
              <View style={styles.qualityItem}>
                <Text style={styles.qualityLabel}>Recapture Rate</Text>
                <Text style={[styles.qualityVal, { color: COLORS.warning }]}>{quality?.rejectionRate ?? 5.8}%</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Navigation Quick Links for District Officer */}
      <View style={styles.quickLinks}>
        <Text style={styles.quickTitle}>District Operations</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('ScreeningsTab')}
          >
            <Text style={styles.quickBtnText}>View All Screenings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('ReferralsTab')}
          >
            <Text style={styles.quickBtnText}>Referral Queue</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('ResourcePlanningTab')}
          >
            <Text style={styles.quickBtnText}>Resource Planning (SimEvents)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 60, maxWidth: 1200, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl, backgroundColor: COLORS.background },
  loadingText: { marginTop: SPACING.md, fontSize: FONTS.sizeMD, color: COLORS.textSecondary },
  sectionWrap: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  sectionTitle: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.textMuted, letterSpacing: 1, marginBottom: SPACING.sm },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  activityRow: { flexDirection: 'row', gap: SPACING.sm },
  activityCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activityTime: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.textMuted, letterSpacing: 0.5 },
  activityValue: { fontSize: FONTS.size2XL, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, marginVertical: 4 },
  activitySub: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary },
  twoCol: { flexDirection: 'column', gap: SPACING.md, paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  twoColDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  col: { flex: 1 },
  panel: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, paddingBottom: SPACING.xs },
  panelTitle: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 0.5 },
  panelBadge: { fontSize: FONTS.sizeXS, color: COLORS.accent, fontWeight: FONTS.weightSemiBold },
  tableHeader: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  th: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.textMuted },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  tdMain: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightMedium, color: COLORS.textPrimary },
  tdSub: { fontSize: FONTS.sizeXS, color: COLORS.textMuted },
  severityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  colorBar: { width: 8, height: 16, borderRadius: 2, marginRight: SPACING.sm },
  severityName: { fontSize: FONTS.sizeSM, color: COLORS.textPrimary },
  severityCount: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightSemiBold, color: COLORS.textPrimary, marginRight: SPACING.sm },
  severityPct: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, width: 45, textAlign: 'right' },
  qualityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  qualityItem: { flex: 1, minWidth: 120, backgroundColor: COLORS.surfaceAlt, padding: SPACING.sm, borderRadius: RADIUS.sm },
  qualityLabel: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginBottom: 2 },
  qualityVal: { fontSize: FONTS.sizeLG, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  errorBanner: { backgroundColor: COLORS.errorLight, padding: SPACING.md, margin: SPACING.lg, borderRadius: RADIUS.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  errorText: { color: COLORS.error, fontSize: FONTS.sizeSM, flex: 1 },
  retryBtn: { paddingVertical: 4, paddingHorizontal: SPACING.md, backgroundColor: COLORS.error, borderRadius: RADIUS.sm, marginLeft: SPACING.sm },
  retryText: { color: '#fff', fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold },
  quickLinks: { paddingHorizontal: SPACING.lg, marginTop: SPACING.xl },
  quickTitle: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.textMuted, letterSpacing: 1, marginBottom: SPACING.sm },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  quickBtn: { backgroundColor: COLORS.surface, paddingVertical: 10, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border },
  quickBtnText: { fontSize: FONTS.sizeSM, color: COLORS.accent, fontWeight: FONTS.weightSemiBold },
});
