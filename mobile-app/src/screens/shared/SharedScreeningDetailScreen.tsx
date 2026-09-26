// ============================================================
// RETINOVA — Shared Reusable Screening Detail / Case Review
// Works across: ASHA Worker, District Manager, Reviewing Doctor
// Single Source of Truth: Loaded strictly by exact Screening ID
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, ActivityIndicator,
  TouchableOpacity, Linking, Alert, useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { screeningService } from '../../services/screeningService';
import { reportService } from '../../services/reportService';
import {
  Button, SectionHeader, InfoRow, StatusBadge, Divider, FormInput,
  RetinovaLogo, RoleBadge, GradeBadge, Card,
} from '../../components';
import { referralService } from '../../services/referralService';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, FONT_FAMILY, GRADE_LABELS, GRADE_SHORT } from '../../utils/constants';
import type { Screening, ReferralActionTaken } from '../../types';

export default function SharedScreeningDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 850;

  // Screening ID is the single source of truth
  const screeningId: string = route.params?.screeningId;

  const [screening, setScreening] = useState<Screening | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Doctor Review state
  const [actionTaken, setActionTaken] = useState<ReferralActionTaken>('referral_completed');
  const [actionNotes, setActionNotes] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');

  const loadCase = () => {
    if (!screeningId) {
      setError('Screening ID parameter is missing.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    screeningService.getById(screeningId)
      .then((data) => {
        setScreening(data);
        if (data.referral?.action_taken) {
          setActionTaken(data.referral.action_taken as ReferralActionTaken);
        }
        if (data.referral?.action_notes) {
          setActionNotes(data.referral.action_notes);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load screening record.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCase();
  }, [screeningId]);

  const handleDoctorReview = async () => {
    if (!screeningId) return;
    setSavingReview(true);
    setReviewSuccess('');
    try {
      const res = await referralService.updateAction(screeningId, {
        action_taken: actionTaken,
        action_notes: actionNotes.trim(),
      });
      setReviewSuccess(res.message || 'Clinical review saved successfully.');
      loadCase(); // reload updated record
    } catch (err: any) {
      Alert.alert('Review Error', err.message || 'Failed to record clinical review.');
    } finally {
      setSavingReview(false);
    }
  };

  const openHtmlReport = async () => {
    if (!screeningId) return;
    const url = reportService.getReportHtmlUrl(screeningId);
    try {
      if (typeof window !== 'undefined' && window.open) {
        window.open(url, '_blank');
      } else {
        await Linking.openURL(url);
      }
    } catch {
      Alert.alert('Report Link', url);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Loading screening ID: {screeningId}...</Text>
      </View>
    );
  }

  if (error || !screening) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Unable to Load Case</Text>
        <Text style={styles.errorText}>{error || 'Screening record not found.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadCase}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { classification, quality, referral, image, patient, facility } = screening;
  const fundusUrl = image?.storage_url ? screeningService.fullImageUrl(image.storage_url) : null;
  const gradcamUrl = screening.explainability?.gradcam_url ? screeningService.fullImageUrl(screening.explainability.gradcam_url) : null;
  const vesselUrl = screening.segmentation?.vessel_mask_url ? screeningService.fullImageUrl(screening.segmentation.vessel_mask_url) : null;
  const lesionUrl = screening.segmentation?.lesion_mask_url ? screeningService.fullImageUrl(screening.segmentation.lesion_mask_url) : null;

  const decision = classification?.decision ?? (quality?.accepted === false ? 'RECAPTURE' : 'Awaiting update');
  const isRefer = decision === 'REFER';
  const isRecapture = decision === 'RECAPTURE';
  const isScreen = decision === 'SCREEN';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Bar */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.brandRow}>
            <RetinovaLogo size="sm" />
            <RoleBadge role="Case File" />
          </View>
          <Text style={styles.title}>{patient?.name || 'Patient Record'}</Text>
          <Text style={styles.screeningId}>Screening ID: {screening.id}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.reportBtn} onPress={openHtmlReport} activeOpacity={0.75}>
            <Text style={styles.reportBtnText}>Print Report</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Decision Banner */}
      <View style={[
        styles.decisionBanner,
        isRefer ? styles.decisionBannerRefer : isScreen ? styles.decisionBannerScreen : styles.decisionBannerRecapture
      ]}>
        <View>
          <Text style={styles.decisionSub}>AI SCREENING DECISION</Text>
          <Text style={[
            styles.decisionText,
            isRefer ? { color: COLORS.maroon900 } : isScreen ? { color: COLORS.green700 } : { color: COLORS.amber700 }
          ]}>
            {decision}
          </Text>
        </View>
        {classification && (
          <View style={styles.decisionMetrics}>
            <GradeBadge grade={classification.predicted_grade} size="large" />
            <Text style={styles.decisionMetricSub}>
              {classification.g2plus_probability_calibrated !== undefined
                ? `${(classification.g2plus_probability_calibrated * 100).toFixed(1)}% Risk P(G2+)`
                : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Main Grid: Responsive 2-column or stacked */}
      <View style={[styles.mainGrid, isDesktop && styles.desktopGrid]}>
        {/* Column 1: Patient & Screening Info + Fundus Image */}
        <View style={[styles.col, isDesktop && styles.desktopCol]}>
          <View style={styles.panel}>
            <SectionHeader title="Patient Information" />
            <InfoRow label="Full Name" value={patient?.name} />
            <InfoRow label="Age / Gender" value={patient ? `${patient.age ?? '--'} yrs · ${patient.gender ?? '--'}` : undefined} />
            <InfoRow label="Location" value={patient?.location} />
            <InfoRow label="Phone" value={patient?.phone || 'Not recorded'} />
            <InfoRow
              label="Diabetes Duration"
              value={patient?.diabetes_duration_years !== undefined ? `${patient.diabetes_duration_years} years` : 'Not recorded'}
            />
          </View>

          <View style={styles.panel}>
            <SectionHeader title="Screening Details" />
            <InfoRow label="Date" value={new Date(screening.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
            <InfoRow label="Eye Examined" value={screening.eye ? (screening.eye === 'left' ? 'OS (Left Eye)' : 'OD (Right Eye)') : undefined} />
            <InfoRow label="Facility" value={facility?.name || screening.facility_id} />
            <InfoRow label="Status" value={screening.status?.toUpperCase()} />
          </View>

          {/* Fundus Image Preview */}
          {fundusUrl && (
            <View style={styles.panel}>
              <SectionHeader title="Original Fundus Image" />
              <View style={styles.imageBox}>
                <Image source={{ uri: fundusUrl }} style={styles.image} resizeMode="contain" />
              </View>
              {image?.original_filename && (
                <Text style={styles.imageCaption}>Source: {image.original_filename}</Text>
              )}
            </View>
          )}
        </View>

        {/* Column 2: AI Result, Quality, Referral & Evidence */}
        <View style={[styles.col, isDesktop && styles.desktopCol]}>
          {/* AI Result Details */}
          <View style={styles.panel}>
            <SectionHeader title="AI Diagnostic Grading" />
            {classification ? (
              <>
                <View style={styles.gradeBox}>
                  <GradeBadge grade={classification.predicted_grade} size="large" />
                  <View style={{ flex: 1, marginLeft: SPACING.md }}>
                    <Text style={styles.gradeTitle}>{GRADE_LABELS[classification.predicted_grade]}</Text>
                    <Text style={styles.gradeDesc}>
                      {classification.referable ? 'Referable Diabetic Retinopathy Detected' : 'No referable diabetic retinopathy'}
                    </Text>
                  </View>
                </View>
                <InfoRow
                  label="Calibrated Risk P(G2+)"
                  value={classification.g2plus_probability_calibrated !== undefined
                    ? `${(classification.g2plus_probability_calibrated * 100).toFixed(2)}%`
                    : (classification.calibrated_confidence ? `${classification.calibrated_confidence.toFixed(1)}%` : undefined)}
                />
                <InfoRow label="Referral Recommended" value={classification.referable ? 'Yes (Priority evaluation)' : 'No (Routine annual check)'} />
              </>
            ) : (
              <Text style={styles.muteText}>AI classification awaiting update.</Text>
            )}
          </View>

          {/* Image Quality Gate */}
          <View style={styles.panel}>
            <SectionHeader title="Image Quality Gate (IQA)" />
            {quality ? (
              <>
                <InfoRow label="Quality Status" value={quality.accepted ? 'Accepted (Pass)' : 'Rejected (Recapture required)'} />
                <InfoRow label="Quality Score" value={quality.quality_score !== undefined ? `${quality.quality_score} / 100` : undefined} />
                {quality.rejection_reason ? (
                  <InfoRow label="Quality Finding" value={quality.rejection_reason} />
                ) : null}
              </>
            ) : (
              <Text style={styles.muteText}>Quality assessment not recorded.</Text>
            )}
          </View>

          {/* Explainable AI Evidence Previews */}
          <View style={styles.panel}>
            <SectionHeader title="Explainability & Segmentation" />
            <View style={styles.evidenceGrid}>
              {gradcamUrl && (
                <View style={styles.evidenceThumbCard}>
                  <Text style={styles.evidenceThumbLabel}>Grad-CAM Heatmap</Text>
                  <Image source={{ uri: gradcamUrl }} style={styles.evidenceThumbImg} resizeMode="contain" />
                </View>
              )}
              {vesselUrl && (
                <View style={styles.evidenceThumbCard}>
                  <Text style={styles.evidenceThumbLabel}>Vessel Segmentation</Text>
                  <Image source={{ uri: vesselUrl }} style={styles.evidenceThumbImg} resizeMode="contain" />
                </View>
              )}
              {lesionUrl && (
                <View style={styles.evidenceThumbCard}>
                  <Text style={[styles.evidenceThumbLabel, { color: COLORS.maroon900 }]}>CANDIDATE LESIONS</Text>
                  <Image source={{ uri: lesionUrl }} style={styles.evidenceThumbImg} resizeMode="contain" />
                  <Text style={styles.evidenceNotice}>Heuristic candidate detections (unconfirmed)</Text>
                </View>
              )}
            </View>
          </View>

          {/* Referral Lifecycle & Doctor Review Section */}
          <View style={styles.panel}>
            <SectionHeader title="Referral & Clinical Review" />
            {referral ? (
              <>
                <InfoRow label="Referral Status" value={referral.status?.toUpperCase()} />
                <InfoRow label="Urgency Priority" value={referral.priority ? referral.priority.toUpperCase() : 'Routine'} />
                <InfoRow label="Referral Reason" value={referral.reason} />
                <InfoRow label="Recommended Action" value={referral.recommended_action} />
                <InfoRow label="Current Outcome" value={referral.action_taken ? referral.action_taken.replace(/_/g, ' ').toUpperCase() : 'Pending review'} />
                {referral.action_notes ? (
                  <InfoRow label="Reviewer Notes" value={referral.action_notes} />
                ) : null}
              </>
            ) : (
              <Text style={styles.muteText}>No referral created for this screening.</Text>
            )}

            {/* Doctor Review Action Form (Visible to Doctor or Admin) */}
            {(user?.role === 'doctor' || user?.role === 'admin') && (
              <View style={styles.doctorForm}>
                <Divider />
                <Text style={styles.doctorFormTitle}>Record Clinical Review</Text>
                <Text style={styles.doctorFormSub}>
                  Enter reviewing ophthalmologist findings and update the referral disposition.
                </Text>

                {reviewSuccess ? (
                  <View style={styles.successBox}>
                    <Text style={styles.successText}>{reviewSuccess}</Text>
                  </View>
                ) : null}

                <Text style={styles.fieldLabel}>Disposition Outcome</Text>
                <View style={styles.actionPills}>
                  {[
                    { key: 'referral_completed', label: 'Referral Completed' },
                    { key: 'patient_advised', label: 'Patient Advised' },
                    { key: 'followup_scheduled', label: 'Follow-up Scheduled' },
                  ].map(item => (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.pill, actionTaken === item.key && styles.pillActive]}
                      onPress={() => setActionTaken(item.key as ReferralActionTaken)}
                    >
                      <Text style={[styles.pillText, actionTaken === item.key && styles.pillTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <FormInput
                  label="Clinical Review Notes"
                  value={actionNotes}
                  onChangeText={setActionNotes}
                  placeholder="e.g., Confirmed moderate NPDR. Schedule FFA and laser evaluation..."
                  multiline
                  numberOfLines={3}
                  style={{ minHeight: 70 }}
                />

                <Button
                  title={savingReview ? 'Saving Review...' : 'SUBMIT CLINICAL REVIEW'}
                  onPress={handleDoctorReview}
                  loading={savingReview}
                  fullWidth
                />
              </View>
            )}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl, backgroundColor: COLORS.background },
  loadingText: { marginTop: SPACING.md, fontSize: FONTS.sizeMD, color: COLORS.textSecondary },
  errorTitle: { fontSize: FONTS.sizeXL, fontWeight: FONTS.weightBold, color: COLORS.maroon900, marginBottom: SPACING.sm },
  errorText: { fontSize: FONTS.sizeMD, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.lg },
  retryBtn: { paddingVertical: 10, paddingHorizontal: SPACING.xl, backgroundColor: COLORS.primary, borderRadius: RADIUS.md },
  retryBtnText: { color: COLORS.white, fontWeight: FONTS.weightBold },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.xs },
  title: { fontSize: 24, fontFamily: FONT_FAMILY.display, color: COLORS.navy900 },
  screeningId: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 2, fontFamily: FONT_FAMILY.mono },
  headerActions: { marginLeft: SPACING.md },
  reportBtn: {
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.teal50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.teal200,
  },
  reportBtnText: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.primary },
  decisionBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  decisionBannerScreen: { backgroundColor: COLORS.green50, borderColor: COLORS.green700 },
  decisionBannerRefer: { backgroundColor: COLORS.maroon50, borderColor: COLORS.maroon900 },
  decisionBannerRecapture: { backgroundColor: COLORS.amber50, borderColor: COLORS.amber700 },
  decisionSub: { fontSize: 9.5, fontWeight: FONTS.weightBold, color: COLORS.textMuted, letterSpacing: 0.8 },
  decisionText: { fontSize: FONTS.size2XL, fontWeight: FONTS.weightBold, letterSpacing: 1 },
  decisionMetrics: { alignItems: 'flex-end', gap: 4 },
  decisionMetricSub: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, fontWeight: FONTS.weightSemiBold },
  mainGrid: { flexDirection: 'column', gap: SPACING.md },
  desktopGrid: { flexDirection: 'row', alignItems: 'flex-start' },
  col: { flex: 1, gap: SPACING.md },
  desktopCol: { flex: 1 },
  panel: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.card,
  },
  imageBox: {
    height: 240,
    backgroundColor: '#000000',
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  image: { width: '100%', height: 240 },
  imageCaption: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, textAlign: 'center', marginTop: SPACING.xs, fontFamily: FONT_FAMILY.mono },
  gradeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.teal50,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.teal100,
  },
  gradeTitle: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.navy900 },
  gradeDesc: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, marginTop: 2 },
  muteText: { fontSize: FONTS.sizeSM, color: COLORS.textMuted, fontStyle: 'italic', paddingVertical: SPACING.sm },
  evidenceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginTop: SPACING.xs },
  evidenceThumbCard: {
    flex: 1,
    minWidth: 120,
    backgroundColor: COLORS.surface,
    padding: SPACING.xs,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  evidenceThumbLabel: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightSemiBold, color: COLORS.textSecondary, marginBottom: 4 },
  evidenceThumbImg: { width: '100%', height: 110, backgroundColor: '#000000', borderRadius: RADIUS.sm },
  evidenceNotice: { fontSize: 9, color: COLORS.textMuted, fontStyle: 'italic', marginTop: 2 },
  doctorForm: { marginTop: SPACING.md },
  doctorFormTitle: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightBold, color: COLORS.navy900, letterSpacing: 0.5 },
  doctorFormSub: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginBottom: SPACING.md },
  fieldLabel: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightMedium, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  actionPills: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginBottom: SPACING.md },
  pill: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pillActive: { backgroundColor: COLORS.teal50, borderColor: COLORS.teal700 },
  pillText: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary },
  pillTextActive: { color: COLORS.teal800, fontWeight: FONTS.weightBold },
  successBox: { backgroundColor: COLORS.green50, padding: SPACING.sm, borderRadius: RADIUS.md, marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.green700 },
  successText: { fontSize: FONTS.sizeSM, color: COLORS.green700, fontWeight: FONTS.weightSemiBold },
});
