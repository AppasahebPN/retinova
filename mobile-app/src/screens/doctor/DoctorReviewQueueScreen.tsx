// ============================================================
// RETINOVA — Reviewing Ophthalmologist Queue (Role 3)
// Figma Make Source of Truth — Polished Healthcare UI System
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { referralService } from '../../services/referralService';
import {
  RoleHeader,
  FilterChip,
  StatusBadge,
  PriorityBadge,
  GradeBadge,
} from '../../components';
import {
  COLORS,
  FONTS,
  SPACING,
  RADIUS,
  SHADOWS,
  FONT_FAMILY,
  GRADE_SHORT,
} from '../../utils/constants';
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
      const res = await referralService.listReferrals({ limit: 100 });
      // Filter screenings with referrals or referable grade >= 1
      const list = (res.screenings || []).filter((s) => {
        return (
          !!s.referral ||
          (s.classification?.predicted_grade !== undefined &&
            s.classification.predicted_grade > 0)
        );
      });
      setScreenings(list);
    } catch (err: any) {
      const msg = err.message || 'Unable to load doctor review queue.';
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

  const isCaseReviewed = (s: Screening) =>
    s.referral?.action_taken === 'referral_completed' ||
    s.referral?.action_taken === 'patient_advised';

  const isCaseHighPriority = (s: Screening) =>
    s.referral?.priority === 'urgent' ||
    s.referral?.priority === 'priority' ||
    (s.classification?.predicted_grade ?? 0) >= 3;

  const pendingCases = screenings.filter((s) => !isCaseReviewed(s));
  const reviewedCases = screenings.filter((s) => isCaseReviewed(s));

  const highPriorityCount = pendingCases.filter((s) => isCaseHighPriority(s)).length;
  const moderatePriorityCount = pendingCases.length - highPriorityCount;

  const filtered = screenings.filter((s) => {
    if (activeFilter === 'high_priority') return isCaseHighPriority(s) && !isCaseReviewed(s);
    if (activeFilter === 'pending') return !isCaseReviewed(s);
    if (activeFilter === 'reviewed') return isCaseReviewed(s);
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <RoleHeader
        title="Ophthalmologist Specialist Review"
        subtitle="Review referred diabetic retinopathy screening cases and record clinical disposition"
        roleLabel="Ophthalmologist"
        userName={user?.full_name}
        facilityName={user?.facility?.name || 'District Health Administration'}
        onLogout={logout}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.teal800}
          />
        }
      >
        <View style={styles.innerContainer}>
          {/* Top Title & Priority Badges Row (Figma Style) */}
          <View style={styles.topTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageHeading}>Review Queue</Text>
              <Text style={styles.pageSubtitle}>
                {pendingCases.length} cases awaiting clinical disposition
              </Text>
            </View>
            <View style={styles.priorityBadgeGroup}>
              <View style={styles.highPill}>
                <Text style={styles.highPillText}>{highPriorityCount} High</Text>
              </View>
              <View style={styles.modPill}>
                <Text style={styles.modPillText}>{moderatePriorityCount} Moderate</Text>
              </View>
            </View>
          </View>

          {/* Filter Chips Bar */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterBarScroll}
            contentContainerStyle={styles.filterBarContent}
          >
            <FilterChip
              label="All Cases"
              active={activeFilter === 'all'}
              onPress={() => setActiveFilter('all')}
              count={screenings.length}
            />
            <FilterChip
              label="High-Priority (G3/G4)"
              active={activeFilter === 'high_priority'}
              onPress={() => setActiveFilter('high_priority')}
              count={highPriorityCount}
            />
            <FilterChip
              label="Pending Review"
              active={activeFilter === 'pending'}
              onPress={() => setActiveFilter('pending')}
              count={pendingCases.length}
            />
            <FilterChip
              label="Reviewed"
              active={activeFilter === 'reviewed'}
              onPress={() => setActiveFilter('reviewed')}
              count={reviewedCases.length}
            />
          </ScrollView>

          {loading && !refreshing ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={COLORS.teal800} size="large" />
              <Text style={styles.loadingText}>Loading review queue from server...</Text>
            </View>
          ) : fetchError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{fetchError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchQueue}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No cases match the selected filter.</Text>
            </View>
          ) : (
            <View style={styles.casesList}>
              {/* Render Active / Pending Cases */}
              {filtered
                .filter((s) => !isCaseReviewed(s))
                .map((item) => {
                  const grade = item.classification?.predicted_grade;
                  const risk = item.classification?.g2plus_probability_calibrated;
                  const isHighPriority = isCaseHighPriority(item);
                  const priority = isHighPriority ? 'HIGH' : 'MODERATE';
                  const patientName = item.patient?.name || 'Patient Record';
                  const riskFormatted =
                    risk !== undefined ? `${(risk * 100).toFixed(1)}%` : '--';

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.caseCard,
                        {
                          borderLeftColor: isHighPriority
                            ? COLORS.maroon700
                            : COLORS.amber600,
                        },
                      ]}
                      onPress={() =>
                        navigation.navigate('DoctorClinicalReview', { screeningId: item.id })
                      }
                      activeOpacity={0.85}
                    >
                      <View style={styles.caseTop}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.patientNameRow}>
                            <Text style={styles.patientName}>{patientName}</Text>
                            {item.patient?.age ? (
                              <Text style={styles.patientAge}>({item.patient.age}y)</Text>
                            ) : null}
                          </View>
                          <Text style={styles.facilityText}>
                            Facility:{' '}
                            <Text style={styles.facilityValue}>
                              {item.facility?.name || 'Community PHC'}
                            </Text>
                            {'    '}Eye:{' '}
                            <Text style={styles.facilityValue}>
                              {item.eye?.toUpperCase() || '--'}
                            </Text>
                          </Text>
                          <Text style={styles.screenedDateText}>
                            Screened:{' '}
                            {new Date(item.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>
                        </View>
                        <PriorityBadge priority={priority} />
                      </View>

                      <View style={styles.gradeAndReasonRow}>
                        <GradeBadge
                          grade={grade !== undefined ? GRADE_SHORT[grade] : 'G?'}
                          risk={riskFormatted}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reasonLabel}>Referral Reason:</Text>
                          <Text style={styles.reasonText} numberOfLines={2}>
                            {item.referral?.reason ||
                              'Referable Diabetic Retinopathy detected. Specialist clinical review required.'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardFooterLink}>
                        <Text style={styles.openWorkstationText}>
                          Open Clinical Review Workstation →
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

              {/* Render Reviewed Section if activeFilter includes reviewed */}
              {(activeFilter === 'all' || activeFilter === 'reviewed') &&
                reviewedCases.length > 0 && (
                  <View style={styles.reviewedSection}>
                    <Text style={styles.sectionLabel}>Reviewed Cases</Text>
                    {reviewedCases.map((item) => (
                      <TouchableOpacity
                        key={`reviewed-${item.id}`}
                        style={styles.reviewedCard}
                        onPress={() =>
                          navigation.navigate('DoctorClinicalReview', { screeningId: item.id })
                        }
                        activeOpacity={0.8}
                      >
                        <View style={styles.checkCircle}>
                          <Text style={styles.checkIcon}>✓</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.reviewedPatientName}>
                            {item.patient?.name || 'Patient Record'},{' '}
                            {item.patient?.age ? `${item.patient.age}y` : ''}
                          </Text>
                          <Text style={styles.reviewedDispositionText} numberOfLines={1}>
                            {item.referral?.action_notes || 'Clinical examination recorded'}
                          </Text>
                        </View>
                        <StatusBadge label="Reviewed" type="reviewed" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { paddingBottom: 60 },
  innerContainer: { maxWidth: 920, width: '100%', alignSelf: 'center', padding: SPACING.lg },

  // Top Title Row
  topTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  pageHeading: {
    fontSize: 24,
    fontWeight: FONTS.weightBold,
    fontFamily: FONT_FAMILY.display,
    color: COLORS.navy800,
  },
  pageSubtitle: {
    fontSize: 13,
    color: COLORS.slate500,
    marginTop: 2,
    fontFamily: FONT_FAMILY.body,
  },
  priorityBadgeGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  highPill: {
    backgroundColor: COLORS.maroon100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  highPillText: {
    fontSize: 11,
    fontWeight: FONTS.weightBold,
    color: COLORS.maroon700,
    letterSpacing: 0.4,
    fontFamily: FONT_FAMILY.body,
  },
  modPill: {
    backgroundColor: COLORS.amber100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  modPillText: {
    fontSize: 11,
    fontWeight: FONTS.weightBold,
    color: COLORS.amber700,
    letterSpacing: 0.4,
    fontFamily: FONT_FAMILY.body,
  },

  // Filter Chips Bar
  filterBarScroll: { maxHeight: 46, marginBottom: SPACING.md },
  filterBarContent: { paddingVertical: 4, gap: 4 },

  // Cases List
  casesList: { gap: 14 },
  caseCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderLeftWidth: 4,
    borderRadius: RADIUS.lg,
    padding: 18,
    ...SHADOWS.card,
  },
  caseTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  patientNameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  patientName: {
    fontSize: 20,
    fontWeight: FONTS.weightBold,
    fontFamily: FONT_FAMILY.display,
    color: COLORS.navy800,
  },
  patientAge: {
    fontSize: 14,
    color: COLORS.slate500,
    fontFamily: FONT_FAMILY.body,
  },
  facilityText: {
    fontSize: 13,
    color: COLORS.slate500,
    marginTop: 3,
    fontFamily: FONT_FAMILY.body,
  },
  facilityValue: {
    color: COLORS.navy700,
    fontWeight: FONTS.weightSemiBold,
  },
  screenedDateText: {
    fontSize: 12,
    color: COLORS.slate400,
    marginTop: 2,
    fontFamily: FONT_FAMILY.body,
  },

  gradeAndReasonRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    marginVertical: 6,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: FONTS.weightBold,
    color: COLORS.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    fontFamily: FONT_FAMILY.body,
  },
  reasonText: {
    fontSize: 13,
    color: COLORS.navy700,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.body,
  },

  cardFooterLink: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    alignItems: 'flex-end',
  },
  openWorkstationText: {
    fontSize: 13,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.teal700,
    fontFamily: FONT_FAMILY.body,
  },

  // Reviewed Section
  reviewedSection: {
    marginTop: SPACING.lg,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: FONTS.weightBold,
    color: COLORS.slate500,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom: 10,
    fontFamily: FONT_FAMILY.body,
  },
  reviewedCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    opacity: 0.85,
    ...SHADOWS.card,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.green100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {
    color: COLORS.green700,
    fontWeight: FONTS.weightBold,
    fontSize: 16,
  },
  reviewedPatientName: {
    fontSize: 14,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    fontFamily: FONT_FAMILY.body,
  },
  reviewedDispositionText: {
    fontSize: 12,
    color: COLORS.slate500,
    marginTop: 2,
    fontFamily: FONT_FAMILY.body,
  },

  // State Views
  loadingBox: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, color: COLORS.slate500, fontFamily: FONT_FAMILY.body },
  errorBox: {
    padding: 20,
    backgroundColor: COLORS.maroon50,
    borderWidth: 1,
    borderColor: COLORS.maroon100,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  errorText: { color: COLORS.maroon700, textAlign: 'center', fontFamily: FONT_FAMILY.body },
  retryBtn: {
    marginTop: 10,
    backgroundColor: COLORS.maroon700,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: FONTS.weightSemiBold },
  emptyBox: {
    padding: 40,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  emptyText: { color: COLORS.slate400, fontFamily: FONT_FAMILY.body },
});
