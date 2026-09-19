// ============================================================
// RETINOVA — District Resource Planning (Role 2)
// Simulink / SimEvents Module 6 Operational Capacity Outputs
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, useWindowDimensions,
} from 'react-native';
import { simulationService } from '../../services/simulationService';
import { StatCard, SectionHeader, InfoRow, StatusBadge } from '../../components';
import { COLORS, FONTS, SPACING, RADIUS } from '../../utils/constants';
import type { SimulationRun } from '../../types';

export default function DistrictResourcePlanningScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 850;

  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<SimulationRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchRuns = async () => {
    try {
      setError('');
      if (__DEV__) console.log('[BOOT API]', { method: 'GET', url: '/api/simulation/runs (resource planning)' });
      const data = await simulationService.listRuns();
      setRuns(data);
      if (data.length > 0 && !selectedRun) {
        setSelectedRun(data[0]);
      }
    } catch (err: any) {
      const msg = err.message || 'Unable to load Simulink capacity data.';
      if (__DEV__) console.error('[BOOT API ERROR]', { url: '/api/simulation/runs', status: 'unknown', message: msg });
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRuns();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.accent} size="large" />
        <Text style={styles.loadingText}>Loading Simulink / SimEvents Capacity Model...</Text>
      </View>
    );
  }

  const res = selectedRun?.result;
  const p = selectedRun?.parameters;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Text style={styles.appName}>RETINOVA</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>District</Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>Operational Capacity Simulation</Text>
        <Text style={styles.headerSub}>
          Simulink / SimEvents discrete-event simulation of district patient flow, camera utilization, and doctor review workloads.
        </Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Scenario Selector */}
      {runs.length > 1 && (
        <View style={styles.scenarioSection}>
          <Text style={styles.sectionTitle}>Select District Scenario</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scenarioScroll}>
            {runs.slice(0, 5).map((r) => {
              const isSelected = selectedRun?.id === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.scenarioCard, isSelected && styles.scenarioCardActive]}
                  onPress={() => setSelectedRun(r)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.scenarioTitle, isSelected && styles.scenarioTitleActive]}>
                    {r.title || 'Screening Scenario'}
                  </Text>
                  <Text style={styles.scenarioMeta}>
                    Arrival: {r.parameters?.patientArrivalRate} pts/day · {r.parameters?.cameras} cameras
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {selectedRun && res && (
        <>
          {/* Key Resource Utilization Metrics */}
          <View style={styles.sectionWrap}>
            <Text style={styles.sectionTitle}>Operational Capacity & Utilization Metrics</Text>
            <View style={styles.kpiGrid}>
              <StatCard
                label="Expected Daily Load"
                value={`${res.throughput} pts/day`}
                subtitle={`Total simulated: ${res.totalPatients} pts`}
                color={COLORS.accent}
              />
              <StatCard
                label="Camera Utilization"
                value={`${res.cameraUtilization}%`}
                subtitle={`${p?.cameras ?? 5} active fundus cameras`}
                badge={res.cameraUtilization > 80 ? 'CONGESTED' : 'BALANCED'}
                badgeType={res.cameraUtilization > 80 ? 'refer' : 'screen'}
                color={res.cameraUtilization > 80 ? COLORS.warning : COLORS.accent}
              />
              <StatCard
                label="AI Server Workload"
                value={`${res.aiUtilization}%`}
                subtitle={`${p?.aiResources ?? 1} Swin V2 / MATLAB worker`}
                color={COLORS.info}
              />
              <StatCard
                label="Doctor Workload"
                value={`${res.doctorUtilization}%`}
                subtitle={`${p?.doctors ?? 1} Reviewing Ophthalmologist`}
                color={COLORS.accentDark}
              />
              <StatCard
                label="Avg Waiting Time"
                value={`${res.averageWaitingTime} min`}
                subtitle={`Max wait observed: ${res.maxWaitingTime} min`}
                badge="SLA"
                badgeType="screen"
              />
              <StatCard
                label="Current Bottleneck"
                value={res.bottleneck || 'Camera Acquisition'}
                subtitle="Primary constraint stage"
                color={COLORS.decisionRecapture}
              />
            </View>
          </View>

          {/* Two-column operational details */}
          <View style={[styles.twoCol, isDesktop && styles.twoColDesktop]}>
            {/* Column 1: Network & Equipment Assumptions */}
            <View style={styles.col}>
              <View style={styles.panel}>
                <SectionHeader title="District Network & Parameters" />
                <InfoRow label="Patient Arrival Rate" value={`${p?.patientArrivalRate} patients / day`} />
                <InfoRow label="Operating Hours" value={`${p?.workingHours} hours / day`} />
                <InfoRow label="Fundus Cameras" value={`${p?.cameras} units deployed`} />
                <InfoRow label="Acquisition Time" value={`${p?.imageAcquisitionTime} minutes / patient`} />
                <InfoRow label="AI Inference Time" value={`${p?.aiProcessingTime} seconds / screening`} />
                <InfoRow label="Quality Rejection Rate" value={`${((p?.qualityRejectionRate ?? 0.08) * 100).toFixed(1)}%`} />
                <InfoRow label="Doctor Review Time" value={`${p?.doctorReviewTime} minutes / referred case`} />
                <InfoRow label="Network Bandwidth" value={`${p?.connectivityBandwidthMbps ?? 5} Mbps uplink`} />
              </View>

              {/* Resource Planning Recommendations */}
              {res.additionalResources && (
                <View style={[styles.panel, { marginTop: SPACING.md }]}>
                  <SectionHeader title="Resource Allocation Plan" />
                  <InfoRow label="Recommended Cameras" value={`+${res.additionalResources.recommendedCameras} additional`} />
                  <InfoRow label="Recommended AI Workers" value={`+${res.additionalResources.recommendedAiWorkers} worker`} />
                  <InfoRow label="Recommended Doctors" value={`+${res.additionalResources.recommendedDoctors} doctor`} />
                  <InfoRow label="Bandwidth Suggestion" value={`${res.additionalResources.bandwidthSuggestionMbps} Mbps`} />
                  <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Operational Assessment:</Text>
                    <Text style={styles.notesText}>{res.additionalResources.notes}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Column 2: Hourly Queue Depths */}
            <View style={styles.col}>
              <View style={styles.panel}>
                <SectionHeader title="Hourly Queue Depths (SimEvents)" />
                <View style={styles.queueHeader}>
                  <Text style={[styles.qTh, { flex: 1 }]}>TIME</Text>
                  <Text style={[styles.qTh, { flex: 1, textAlign: 'center' }]}>CAMERA QUEUE</Text>
                  <Text style={[styles.qTh, { flex: 1, textAlign: 'center' }]}>AI QUEUE</Text>
                  <Text style={[styles.qTh, { flex: 1, textAlign: 'right' }]}>DOCTOR QUEUE</Text>
                </View>
                {(res.queueDepthSeries || []).map((q) => (
                  <View key={q.timeHour} style={styles.queueRow}>
                    <Text style={[styles.qTd, { flex: 1, fontWeight: FONTS.weightBold }]}>
                      {q.timeHour}:00
                    </Text>
                    <View style={[styles.queueCell, { flex: 1 }]}>
                      <Text style={[styles.qVal, q.cameraQueue > 15 && { color: COLORS.error }]}>
                        {q.cameraQueue} pts
                      </Text>
                    </View>
                    <View style={[styles.queueCell, { flex: 1 }]}>
                      <Text style={styles.qVal}>{q.aiQueue} jobs</Text>
                    </View>
                    <View style={[styles.queueCell, { flex: 1, alignItems: 'flex-end' }]}>
                      <Text style={[styles.qVal, q.doctorQueue > 3 && { color: COLORS.warning }]}>
                        {q.doctorQueue} cases
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* 30-Day Throughput Samples */}
              <View style={[styles.panel, { marginTop: SPACING.md }]}>
                <SectionHeader title="Throughput Sample (Day 1 - 5)" />
                {(res.dailyThroughputSeries || []).slice(0, 5).map((d) => (
                  <View key={d.day} style={styles.dayRow}>
                    <Text style={styles.dayLabel}>Day {d.day}</Text>
                    <Text style={styles.dayStats}>
                      Arrived: <Text style={{ fontWeight: FONTS.weightBold }}>{d.arrived}</Text>     Screened: {d.screened}     Wait: {d.avgWaitMin}m
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  loadingText: { marginTop: SPACING.md, fontSize: FONTS.sizeMD, color: COLORS.textSecondary },
  header: {
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 3 },
  appName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 2 },
  roleBadge: { backgroundColor: COLORS.accentLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.accent },
  roleBadgeText: { fontSize: 9.5, fontWeight: FONTS.weightBold, color: COLORS.accent },
  headerTitle: { fontSize: FONTS.sizeLG, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  headerSub: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 2, lineHeight: 16 },
  scenarioSection: { paddingHorizontal: SPACING.lg, marginTop: SPACING.md },
  sectionTitle: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.textMuted, letterSpacing: 1, marginBottom: SPACING.xs },
  scenarioScroll: { flexDirection: 'row' },
  scenarioCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
    minWidth: 220,
  },
  scenarioCardActive: { borderColor: COLORS.accent, backgroundColor: COLORS.accentLight },
  scenarioTitle: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  scenarioTitleActive: { color: COLORS.accent },
  scenarioMeta: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 2 },
  sectionWrap: { paddingHorizontal: SPACING.lg, marginTop: SPACING.md },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  twoCol: { flexDirection: 'column', gap: SPACING.md, paddingHorizontal: SPACING.lg, marginTop: SPACING.md },
  twoColDesktop: { flexDirection: 'row', alignItems: 'flex-start' },
  col: { flex: 1 },
  panel: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notesBox: {
    backgroundColor: COLORS.surfaceAlt,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  notesLabel: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.accent, marginBottom: 2 },
  notesText: { fontSize: FONTS.sizeXS, color: COLORS.textPrimary, lineHeight: 17 },
  queueHeader: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  qTh: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.textMuted },
  queueRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  qTd: { fontSize: FONTS.sizeSM, color: COLORS.textPrimary },
  queueCell: { alignItems: 'center' },
  qVal: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightSemiBold, color: COLORS.textPrimary },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  dayLabel: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  dayStats: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary },
  errorBox: { backgroundColor: COLORS.errorLight, padding: SPACING.md, margin: SPACING.lg, borderRadius: RADIUS.sm },
  errorText: { color: COLORS.error, fontSize: FONTS.sizeSM },
});
