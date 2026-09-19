// ============================================================
// RETINOVA     District Clinical Reports Screen (Role 2)
// Official Clinical Summary & Audit Reports
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Linking, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { screeningService } from '../../services/screeningService';
import { reportService } from '../../services/reportService';
import { StatusBadge } from '../../components';
import { COLORS, FONTS, SPACING, RADIUS, GRADE_SHORT } from '../../utils/constants';
import type { Screening } from '../../types';

export default function DistrictReportsScreen() {
  const navigation = useNavigation<any>();
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await screeningService.list({ limit: 50 });
      setScreenings(res.screenings || []);
    } catch (err) {
      console.warn('Failed to load reports:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const openHtml = async (screeningId: string) => {
    const url = reportService.getReportHtmlUrl(screeningId);
    try {
      if (typeof window !== 'undefined' && window.open) {
        window.open(url, '_blank');
      } else {
        await Linking.openURL(url);
      }
    } catch {
      Alert.alert('Report URL', url);
    }
  };

  const renderItem = ({ item }: { item: Screening }) => {
    const decision = item.classification?.decision ?? 'SCREEN';
    const isRefer = decision === 'REFER';
    const grade = item.classification?.predicted_grade;

    return (
      <View style={styles.card}>
        <View style={styles.cardMain}>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{item.patient?.name || 'Patient Report'}</Text>
            <Text style={styles.reportMeta}>
              Eye: {item.eye?.toUpperCase()} · Grade: {grade !== undefined ? GRADE_SHORT[grade] : '--'} · {new Date(item.created_at).toLocaleDateString('en-IN')}
            </Text>
            <Text style={styles.screeningId}>ID: {item.id}</Text>
          </View>
          <StatusBadge label={decision} type={isRefer ? 'refer' : 'screen'} />
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() => navigation.navigate('SharedScreeningDetail', { screeningId: item.id })}
          >
            <Text style={styles.detailBtnText}>View File</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.printBtn}
            onPress={() => openHtml(item.id)}
          >
            <Text style={styles.printBtnText}>Print Clinical Report</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <Text style={styles.appName}>RETINOVA</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>District</Text>
          </View>
        </View>
        <Text style={styles.title}>District Clinical Reports</Text>
        <Text style={styles.sub}>
          Verified ophthalmic screening report cards and patient referral documentation.
        </Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={styles.loadingText}>Loading clinical reports...</Text>
        </View>
      ) : (
        <FlatList
          data={screenings}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No clinical reports found.</Text>
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
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 3 },
  appName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 2 },
  roleBadge: { backgroundColor: COLORS.accentLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.accent },
  roleBadgeText: { fontSize: 9.5, fontWeight: FONTS.weightBold, color: COLORS.accent },
  title: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 0.3 },
  sub: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 1 },
  listContent: { padding: SPACING.md, paddingBottom: 60 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  cardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  reportMeta: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 2 },
  screeningId: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, fontFamily: 'monospace', marginTop: 1 },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  detailBtn: { paddingVertical: 6, paddingHorizontal: SPACING.md, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border },
  detailBtnText: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, fontWeight: FONTS.weightSemiBold },
  printBtn: { paddingVertical: 6, paddingHorizontal: SPACING.md, borderRadius: RADIUS.sm, backgroundColor: COLORS.accentLight, borderWidth: 1, borderColor: COLORS.accent },
  printBtnText: { fontSize: FONTS.sizeXS, color: COLORS.accent, fontWeight: FONTS.weightBold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  loadingText: { marginTop: SPACING.md, fontSize: FONTS.sizeMD, color: COLORS.textSecondary },
  empty: { padding: SPACING.xxxl, alignItems: 'center' },
  emptyText: { fontSize: FONTS.sizeMD, color: COLORS.textMuted, textAlign: 'center' },
});
