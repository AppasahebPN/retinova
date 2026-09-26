// ============================================================
// RETINOVA — District Clinical Reports Screen (Role 2)
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
import { StatusBadge, GradeBadge, RetinovaLogo, RoleBadge } from '../../components';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, FONT_FAMILY, GRADE_SHORT } from '../../utils/constants';
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
              Eye: {item.eye?.toUpperCase()} · {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {item.facility?.name || 'Primary Center'}
            </Text>
            <Text style={styles.screeningId}>ID: {item.id}</Text>
          </View>
          <StatusBadge label={decision} type={isRefer ? 'refer' : 'screen'} />
        </View>

        <View style={styles.cardMiddle}>
          {grade !== undefined ? (
            <GradeBadge grade={grade} size="small" />
          ) : (
            <Text style={styles.ungraded}>Awaiting Grading</Text>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.detailBtn}
            onPress={() => navigation.navigate('SharedScreeningDetail', { screeningId: item.id })}
            activeOpacity={0.7}
          >
            <Text style={styles.detailBtnText}>View File</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.printBtn}
            onPress={() => openHtml(item.id)}
            activeOpacity={0.7}
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
          <RetinovaLogo size="sm" />
          <RoleBadge role="District Manager" />
        </View>
        <Text style={styles.title}>District Clinical Reports</Text>
        <Text style={styles.sub}>
          Verified ophthalmic screening report cards and patient referral documentation.
        </Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} size="large" />
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
    ...SHADOWS.card,
  },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs },
  title: { fontSize: 24, fontFamily: FONT_FAMILY.display, color: COLORS.navy900, letterSpacing: 0.3 },
  sub: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 1 },
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
  cardMain: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.navy900 },
  reportMeta: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 2 },
  screeningId: { fontSize: 11, color: COLORS.textMuted, fontFamily: FONT_FAMILY.mono, marginTop: 2 },
  cardMiddle: { marginTop: SPACING.xs, marginBottom: SPACING.xs },
  ungraded: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, fontStyle: 'italic' },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  detailBtn: {
    paddingVertical: 7,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  detailBtnText: { fontSize: FONTS.sizeXS, color: COLORS.navy800, fontWeight: FONTS.weightSemiBold },
  printBtn: {
    paddingVertical: 7,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
  },
  printBtnText: { fontSize: FONTS.sizeXS, color: COLORS.white, fontWeight: FONTS.weightBold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  loadingText: { marginTop: SPACING.md, fontSize: FONTS.sizeMD, color: COLORS.textSecondary },
  empty: { padding: SPACING.xxxl, alignItems: 'center' },
  emptyText: { fontSize: FONTS.sizeMD, color: COLORS.textMuted, textAlign: 'center' },
});
