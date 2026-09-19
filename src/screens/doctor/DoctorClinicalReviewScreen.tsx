// ============================================================
// RETINOVA — Doctor Clinical Review Workspace (Role 3)
// Tri-Panel Specialist Ophthalmology Workstation
// Left: Fundus Image | Center: AI Evidence | Right: Clinical Review
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, ActivityIndicator,
  TouchableOpacity, Alert, useWindowDimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { screeningService } from '../../services/screeningService';
import { referralService } from '../../services/referralService';
import { SectionHeader, InfoRow, Button, FormInput, StatusBadge, Divider } from '../../components';
import { COLORS, FONTS, SPACING, RADIUS, GRADE_LABELS, GRADE_SHORT } from '../../utils/constants';
import type { Screening, ReferralActionTaken } from '../../types';

export default function DoctorClinicalReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width } = useWindowDimensions();
  const isTriPanel = width >= 1080;

  const screeningId: string = route.params?.screeningId;

  const [screening, setScreening] = useState<Screening | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Mobile/Tablet tab switcher for narrow screens
  const [activeTab, setActiveTab] = useState<'image' | 'evidence' | 'clinical'>('clinical');

  // Toggleable Evidence Layers (Part 12)
  type EvidenceLayer = 'combined' | 'original' | 'enhanced' | 'gradcam' | 'vessels' | 'lesions';
  const [activeLayer, setActiveLayer] = useState<EvidenceLayer>('combined');

  // Doctor Clinical Outcome Form
  const [actionTaken, setActionTaken] = useState<ReferralActionTaken>('referral_completed');
  const [actionNotes, setActionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');

  const loadCase = () => {
    if (!screeningId) {
      setError('Screening ID missing from navigation.');
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
        setError(err.message || 'Failed to load case data.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCase();
  }, [screeningId]);

  const handleSubmitReview = async () => {
    if (!screeningId) return;
    setSubmitting(true);
    setSubmitSuccess('');
    try {
      const res = await referralService.updateAction(screeningId, {
        action_taken: actionTaken,
        action_notes: actionNotes.trim(),
      });
      setSubmitSuccess(res.message || 'Clinical review recorded successfully.');
      loadCase();
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Unable to record clinical review.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.accent} size="large" />
        <Text style={styles.loadingText}>Opening Clinical Review Workstation for ID: {screeningId}...</Text>
      </View>
    );
  }

  if (error || !screening) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Workstation Error</Text>
        <Text style={styles.errorText}>{error || 'Screening record not found.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadCase}>
          <Text style={styles.retryBtnText}>Retry Case</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { classification, quality, referral, image, patient, explainability, segmentation, facility } = screening;
  const fundusUrl = image?.storage_url ? screeningService.fullImageUrl(image.storage_url) : null;
  const enhancedUrl = screening.enhancement?.enhanced_image_url ? screeningService.fullImageUrl(screening.enhancement.enhanced_image_url) : null;
  const gradcamUrl = explainability?.gradcam_url ? screeningService.fullImageUrl(explainability.gradcam_url) : null;
  const vesselUrl = segmentation?.vessel_mask_url ? screeningService.fullImageUrl(segmentation.vessel_mask_url) : null;
  const lesionUrl = segmentation?.lesion_mask_url ? screeningService.fullImageUrl(segmentation.lesion_mask_url) : null;
  const combinedEvidenceUrl = (segmentation?.retinal_evidence_url || segmentation?.evidence_overlay_url) ? screeningService.fullImageUrl(segmentation.retinal_evidence_url || segmentation.evidence_overlay_url) : null;

  const grade = classification?.predicted_grade;
  const risk = classification?.g2plus_probability_calibrated;
  const decision = classification?.decision ?? (quality?.accepted === false ? 'RECAPTURE' : 'Awaiting update');
  const isRefer = decision === 'REFER';

  // ----------------------------------------------------
  // PANEL 1: ORIGINAL FUNDUS IMAGE & QUALITY
  // ----------------------------------------------------
  const renderFundusPanel = () => (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Original Fundus Image</Text>
        <Text style={styles.eyeBadge}>{screening.eye?.toUpperCase() === 'LEFT' ? 'OS (Left Eye)' : 'OD (Right Eye)'}</Text>
      </View>

      {fundusUrl ? (
        <View style={styles.fundusContainer}>
          <Image source={{ uri: fundusUrl }} style={styles.fundusImg} resizeMode="contain" />
        </View>
      ) : (
        <View style={styles.imgPlaceholder}>
          <Text style={styles.placeholderText}>Fundus image unavailable</Text>
        </View>
      )}

      <SectionHeader title="Image Acquisition & Quality" />
      <InfoRow label="Quality Gate" value={quality?.accepted ? 'PASS (Accepted)' : 'FAIL (Recapture Flag)'} />
      <InfoRow label="Quality Score" value={quality?.quality_score !== undefined ? `${quality.quality_score}%` : undefined} />
      <InfoRow label="FOV Coverage" value={quality?.fov_coverage !== undefined ? `${quality.fov_coverage.toFixed(1)}%` : undefined} />
      <InfoRow label="Major Artifact" value={quality?.artifact_type || 'No Major Artifact'} />
      {quality?.rejection_reason ? (
        <InfoRow label="Quality Note" value={quality.rejection_reason} />
      ) : null}
      <InfoRow label="Capture Source" value={image?.original_filename || 'Standard 45° Retinal Camera'} />
    </View>
  );

  // ----------------------------------------------------
  // PANEL 2: AI EVIDENCE & SEGMENTATION (UPGRADED)
  // ----------------------------------------------------
  const renderEvidencePanel = () => {
    // Determine active layer image and description
    let currentLayerUrl = combinedEvidenceUrl || gradcamUrl || fundusUrl;
    let currentLayerTitle = 'Composite Retinal Evidence';
    let currentLayerSubtitle = 'Multi-layer composite: vessels (cyan), hard exudates (yellow), microaneurysms (red), hemorrhages (magenta), optic disc (green), fovea (blue)';

    if (activeLayer === 'original') {
      currentLayerUrl = fundusUrl;
      currentLayerTitle = 'Original Fundus Image';
      currentLayerSubtitle = 'Native optical acquisition (Module 1 Input)';
    } else if (activeLayer === 'enhanced') {
      currentLayerUrl = enhancedUrl || fundusUrl;
      currentLayerTitle = 'Enhanced Fundus Image';
      currentLayerSubtitle = 'CLAHE green-channel normalized (Module 2 Output)';
    } else if (activeLayer === 'gradcam') {
      currentLayerUrl = gradcamUrl;
      currentLayerTitle = 'Grad-CAM Attention Map';
      currentLayerSubtitle = 'Module 5 explainable neural network attribution overlay';
    } else if (activeLayer === 'vessels') {
      currentLayerUrl = vesselUrl;
      currentLayerTitle = 'Retinal Vessel Segmentation';
      currentLayerSubtitle = 'Morphological matched filter vascular caliber & structure';
    } else if (activeLayer === 'lesions') {
      currentLayerUrl = lesionUrl;
      currentLayerTitle = 'Candidate Lesion Proposals';
      currentLayerSubtitle = 'Computer vision proposals for clinician review (not a confirmed diagnosis)';
    }

    const gradcamLesionIoU = segmentation?.gradcam_lesion_iou ?? segmentation?.gradcamLesionIoU;
    const iouDisplay = (typeof gradcamLesionIoU === 'number')
      ? `${(gradcamLesionIoU * 100).toFixed(1)}%`
      : 'Not available';

    const candidateBreakdown = segmentation?.candidate_breakdown || segmentation?.candidateBreakdown;

    return (
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>AI Evidence & Workstation</Text>
          <Text style={styles.panelBadge}>Multi-Layer Evidence</Text>
        </View>

        {/* Toggleable Evidence Layers */}
        <Text style={styles.fieldLabel}>Select Layer View</Text>
        <View style={styles.layerSelectorRow}>
          {[
            { key: 'original', label: 'Original' },
            { key: 'enhanced', label: 'Enhanced' },
            { key: 'gradcam', label: 'Grad-CAM' },
            { key: 'vessels', label: 'Vessels' },
            { key: 'lesions', label: 'Candidate Lesions' },
            { key: 'combined', label: 'Composite' },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.layerChip, activeLayer === item.key && styles.layerChipActive]}
              onPress={() => setActiveLayer(item.key as EvidenceLayer)}
              activeOpacity={0.7}
            >
              <Text style={[styles.layerChipText, activeLayer === item.key && styles.layerChipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Primary Interactive Viewer for Selected Layer */}
        <View style={styles.evidenceBlock}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.evidenceLabel}>{currentLayerTitle}</Text>
            <Text style={styles.layerActiveTag}>{activeLayer.toUpperCase()}</Text>
          </View>
          <Text style={styles.evidenceCaption}>{currentLayerSubtitle}</Text>
          {currentLayerUrl ? (
            <View style={[styles.evidenceImgBox, activeLayer === 'lesions' && { borderColor: COLORS.warning, borderWidth: 1.5 }]}>
              <Image source={{ uri: currentLayerUrl }} style={styles.evidenceImg} resizeMode="contain" />
            </View>
          ) : (
            <View style={styles.imgPlaceholder}>
              <Text style={styles.placeholderText}>{currentLayerTitle} unavailable</Text>
            </View>
          )}
        </View>

        {/* Evidence Information Panel: Neovascularization Assessment */}
        <View style={styles.infoCardBlock}>
          <Text style={styles.infoCardHeading}>Neovascularization Assessment</Text>
          <InfoRow label="Dedicated Assessment" value="Not available" />
          <InfoRow label="Reason" value="No dedicated validated neovascularization detector available." />
          <View style={styles.nvNoticeBox}>
            <Text style={styles.nvNoticeText}>
              Important: Grade 4 classification reflects whole-image neural-network features and does not substitute for a dedicated pixel-level neovascularization assessment.
            </Text>
          </View>
        </View>

        {/* Evidence Information Panel: Grad-CAM <-> Lesion Spatial Alignment */}
        <View style={styles.infoCardBlock}>
          <Text style={styles.infoCardHeading}>Grad-CAM ↔ Lesion Spatial Alignment</Text>
          <InfoRow label="Spatial Agreement (IoU)" value={iouDisplay} />
          <Text style={styles.infoCardSubtext}>
            IoU evaluated between thresholded Swin V2 Grad-CAM saliency activation and Module 3 candidate lesion mask. Low spatial IoU is mathematically expected given the scale disparity between whole-retina classifier attention (~9% of fundus) and punctate candidate lesions (&lt;1% of fundus).
          </Text>
        </View>

        {/* Evidence Information Panel: Candidate Lesion Evidence Breakdown */}
        <View style={styles.infoCardBlock}>
          <Text style={[styles.infoCardHeading, { color: COLORS.warning }]}>Candidate Lesion Evidence</Text>
          <InfoRow label="Total Candidates" value={String(segmentation?.candidate_count ?? segmentation?.totalCandidates ?? '--')} />
          <InfoRow
            label="Bright Candidates"
            value={segmentation?.bright_lesion_count !== undefined
              ? `${segmentation.bright_lesion_count} (EX: ${candidateBreakdown?.hardExudateCandidates ?? '--'}, SE: ${candidateBreakdown?.softExudateCandidates ?? '--'})`
              : undefined}
          />
          <InfoRow
            label="Dark Candidates"
            value={segmentation?.dark_lesion_count !== undefined
              ? `${segmentation.dark_lesion_count} (MA: ${candidateBreakdown?.microaneurysmCandidates ?? '--'}, HE: ${candidateBreakdown?.hemorrhageCandidates ?? '--'})`
              : undefined}
          />
          <InfoRow label="Candidate Coverage" value={segmentation?.lesion_coverage !== undefined ? `${segmentation.lesion_coverage.toFixed(2)}%` : undefined} />
          <InfoRow label="Vessel Coverage" value={segmentation?.vessel_coverage !== undefined ? `${segmentation.vessel_coverage.toFixed(2)}%` : undefined} />
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>Candidate Regions Only</Text>
            <Text style={styles.noticeText}>
              Candidate lesion evidence generated by morphological analysis for clinician review. These regions are not independent diagnostic proof.
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // ----------------------------------------------------
  // PANEL 3: CLINICAL INFO & DOCTOR REVIEW
  // ----------------------------------------------------
  const renderClinicalPanel = () => (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>Clinical Evaluation & Review</Text>
        <StatusBadge label={isRefer ? 'REFERRAL' : 'ROUTINE'} type={isRefer ? 'refer' : 'screen'} />
      </View>

      {/* Distinction Header */}
      <View style={styles.distinctionNotice}>
        <Text style={styles.distinctionTitle}>AI Screening Result vs Doctor Review</Text>
        <Text style={styles.distinctionBody}>
          The AI screening classification is an assistive triaging signal and does NOT constitute a final clinical diagnosis. Qualified doctor review is recorded below.
        </Text>
      </View>

      {/* AI Screening Classification Box */}
      <View style={styles.aiResultCard}>
        <Text style={styles.aiCardSub}>AI Screening Result</Text>
        <View style={styles.aiCardRow}>
          <Text style={styles.aiGradeBig}>{grade !== undefined ? GRADE_SHORT[grade] : '--'}</Text>
          <View style={{ flex: 1, marginLeft: SPACING.md }}>
            <Text style={styles.aiGradeLabel}>{grade !== undefined ? GRADE_LABELS[grade] : 'Awaiting result'}</Text>
            <Text style={[styles.aiDecisionLabel, { color: isRefer ? COLORS.decisionRefer : COLORS.decisionScreen }]}>
              {decision}
            </Text>
          </View>
        </View>
        {risk !== undefined && (
          <InfoRow label="Calibrated Referral Risk" value={`${(risk * 100).toFixed(2)}%`} />
        )}
      </View>

      {/* Patient Clinical History */}
      <SectionHeader title="Patient Clinical Context" />
      <InfoRow label="Patient Name" value={patient?.name} />
      <InfoRow label="Age / Gender" value={patient ? `${patient.age} yrs · ${patient.gender}` : undefined} />
      <InfoRow label="Location" value={patient?.location} />
      <InfoRow label="Diabetes Duration" value={patient?.diabetes_duration_years !== undefined ? `${patient.diabetes_duration_years} years` : 'Not recorded'} />
      <InfoRow label="Facility / PHC" value={facility?.name || screening.facility_id} />
      <InfoRow label="Referral Reason" value={referral?.reason || 'Referable Diabetic Retinopathy detected.'} />

      {/* DOCTOR CLINICAL REVIEW FORM */}
      <View style={styles.reviewFormWrap}>
        <Divider />
        <Text style={styles.doctorFormHeading}>Doctor Clinical Review</Text>
        <Text style={styles.doctorFormSub}>
          Record your specialist examination findings and finalize the referral disposition.
        </Text>

        {submitSuccess ? (
          <View style={styles.successBanner}>
            <Text style={styles.successBannerText}>{submitSuccess}</Text>
          </View>
        ) : null}

        <Text style={styles.fieldLabel}>Clinical Disposition Outcome</Text>
        <View style={styles.pillsRow}>
          {[
            { key: 'referral_completed', label: 'Referral Completed (Examined)' },
            { key: 'patient_advised', label: 'Patient Advised / Reassurance' },
            { key: 'followup_scheduled', label: 'Follow-up Scheduled' },
          ].map(p => (
            <TouchableOpacity
              key={p.key}
              style={[styles.dispositionPill, actionTaken === p.key && styles.dispositionPillActive]}
              onPress={() => setActionTaken(p.key as ReferralActionTaken)}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillLabel, actionTaken === p.key && styles.pillLabelActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FormInput
          label="Specialist Review Notes & Treatment Plan"
          value={actionNotes}
          onChangeText={setActionNotes}
          placeholder="e.g., Confirmed moderate NPDR with macular edema risk. Recommend OCT scan and 3-month follow-up..."
          multiline
          numberOfLines={4}
          style={{ minHeight: 80 }}
        />

        <Button
          title={submitting ? 'Recording Clinical Outcome...' : 'Record Clinical Review'}
          onPress={handleSubmitReview}
          loading={submitting}
          fullWidth
        />
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Workstation Top Bar */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <View style={styles.badgeRow}>
            <Text style={styles.appNameSmall}>RETINOVA</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>Doctor</Text>
            </View>
            <Text style={styles.stationBadge}>Clinical Review Workstation</Text>
          </View>
          <Text style={styles.stationTitle}>{patient?.name || 'Patient'}  ·  Specialist Evaluation</Text>
          <View style={styles.idRow}>
            <Text style={styles.idText}>ID: {screening.id.slice(0, 14)}…</Text>
            <Text style={styles.eyeMeta}>{screening.eye?.toUpperCase() === 'LEFT' ? 'OS — Left Eye' : 'OD — Right Eye'}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Back to queue"
        >
          <Text style={styles.backBtnText}>← Back to Queue</Text>
        </TouchableOpacity>
      </View>

      {/* Narrow Screen Tab Switcher */}
      {!isTriPanel && (
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.switcherTab, activeTab === 'image' && styles.switcherTabActive]}
            onPress={() => setActiveTab('image')}
          >
            <Text style={[styles.switcherText, activeTab === 'image' && styles.switcherTextActive]}>
              1. Fundus Image
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switcherTab, activeTab === 'evidence' && styles.switcherTabActive]}
            onPress={() => setActiveTab('evidence')}
          >
            <Text style={[styles.switcherText, activeTab === 'evidence' && styles.switcherTextActive]}>
              2. AI Evidence
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.switcherTab, activeTab === 'clinical' && styles.switcherTabActive]}
            onPress={() => setActiveTab('clinical')}
          >
            <Text style={[styles.switcherText, activeTab === 'clinical' && styles.switcherTextActive]}>
              3. Clinical Review
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Workspace Body: Tri-Panel on Desktop, Tabbed on Narrow Screen */}
      {isTriPanel ? (
        <View style={styles.triPanelRow}>
          <View style={styles.triColLeft}>{renderFundusPanel()}</View>
          <View style={styles.triColCenter}>{renderEvidencePanel()}</View>
          <View style={styles.triColRight}>{renderClinicalPanel()}</View>
        </View>
      ) : (
        <View style={styles.singleCol}>
          {activeTab === 'image' && renderFundusPanel()}
          {activeTab === 'evidence' && renderEvidencePanel()}
          {activeTab === 'clinical' && renderClinicalPanel()}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.md, paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  loadingText: { marginTop: SPACING.md, fontSize: FONTS.sizeMD, color: COLORS.textSecondary },
  errorTitle: { fontSize: FONTS.sizeXL, fontWeight: FONTS.weightBold, color: COLORS.error, marginBottom: SPACING.xs },
  errorText: { fontSize: FONTS.sizeMD, color: COLORS.textSecondary, marginBottom: SPACING.lg, textAlign: 'center' },
  retryBtn: { paddingVertical: 8, paddingHorizontal: SPACING.xl, backgroundColor: COLORS.accent, borderRadius: RADIUS.sm },
  retryBtnText: { color: COLORS.textInverse, fontWeight: FONTS.weightBold },
  topBar: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3, gap: SPACING.xs, flexWrap: 'wrap' },
  appNameSmall: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 2 },
  roleBadge: { backgroundColor: COLORS.accentLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.accent },
  roleBadgeText: { fontSize: 9.5, fontWeight: FONTS.weightBold, color: COLORS.accent },
  stationBadge: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightSemiBold, color: COLORS.textMuted, letterSpacing: 0.8 },
  idRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: SPACING.md },
  idText: { fontSize: 10, color: COLORS.textMuted, fontFamily: 'monospace' },
  eyeMeta: { fontSize: FONTS.sizeXS, color: COLORS.textMuted },
  stationTitle: { fontSize: FONTS.sizeLG, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  backBtn: { paddingVertical: 7, paddingHorizontal: SPACING.md, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border },
  backBtnText: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, fontWeight: FONTS.weightSemiBold },
  tabSwitcher: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    padding: 3,
  },
  switcherTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: RADIUS.sm },
  switcherTabActive: { backgroundColor: COLORS.accentLight },
  switcherText: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, fontWeight: FONTS.weightMedium },
  switcherTextActive: { color: COLORS.accent, fontWeight: FONTS.weightBold },
  triPanelRow: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start' },
  triColLeft: { width: '31%' },
  triColCenter: { width: '36%' },
  triColRight: { width: '33%' },
  singleCol: { width: '100%' },
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md, paddingBottom: SPACING.xs, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  panelTitle: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 0.5 },
  eyeBadge: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.accent, backgroundColor: COLORS.accentLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: RADIUS.sm },
  panelBadge: { fontSize: FONTS.sizeXS, color: COLORS.textMuted },
  fundusContainer: {
    height: 320,
    backgroundColor: '#000',
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  fundusImg: { width: '100%', height: 320 },
  imgPlaceholder: { height: 260, backgroundColor: COLORS.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.sm },
  placeholderText: { fontSize: FONTS.sizeSM, color: COLORS.textMuted, fontStyle: 'italic' },
  evidenceBlock: { marginBottom: SPACING.md },
  evidenceLabel: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightSemiBold, color: COLORS.textPrimary },
  evidenceCaption: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginTop: 1, marginBottom: 6, lineHeight: 16 },
  evidenceImgBox: {
    height: 200,
    backgroundColor: '#000',
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  evidenceImg: { width: '100%', height: 200 },
  layerSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.sm,
    marginTop: 2,
  },
  layerChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  layerChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  layerChipText: {
    fontSize: 11.5,
    fontWeight: FONTS.weightMedium,
    color: COLORS.textSecondary,
  },
  layerChipTextActive: {
    color: '#ffffff',
    fontWeight: FONTS.weightBold,
  },
  layerActiveTag: {
    fontSize: 10,
    fontWeight: FONTS.weightBold,
    color: COLORS.accent,
    backgroundColor: COLORS.accentLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  infoCardBlock: {
    backgroundColor: COLORS.surfaceAlt,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  infoCardHeading: {
    fontSize: 11,
    fontWeight: FONTS.weightBold,
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoCardSubtext: {
    fontSize: FONTS.sizeXS,
    color: COLORS.textMuted,
    lineHeight: 15,
    marginTop: 2,
  },
  nvNoticeBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: RADIUS.sm,
    padding: 6,
    marginTop: 4,
  },
  nvNoticeText: {
    fontSize: 10.5,
    color: '#92400e',
    lineHeight: 14,
  },
  noticeBox: { backgroundColor: COLORS.warningLight, padding: SPACING.sm, borderRadius: RADIUS.sm, marginTop: SPACING.xs, borderWidth: 1, borderColor: '#E5D5A0', borderLeftWidth: 3, borderLeftColor: COLORS.decisionRecapture },
  noticeTitle: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.decisionRecapture, marginBottom: 3 },
  noticeText: { fontSize: FONTS.sizeXS, color: COLORS.warning, lineHeight: 16 },
  distinctionNotice: {
    backgroundColor: COLORS.infoLight,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#C5D8EB',
    marginBottom: SPACING.md,
  },
  distinctionTitle: { fontSize: FONTS.sizeXS, fontWeight: FONTS.weightBold, color: COLORS.info, letterSpacing: 0.5 },
  distinctionBody: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary, marginTop: 2, lineHeight: 16 },
  aiResultCard: {
    backgroundColor: COLORS.surfaceAlt,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  aiCardSub: { fontSize: 10, fontWeight: FONTS.weightBold, color: COLORS.textMuted, letterSpacing: 0.5 },
  aiCardRow: { flexDirection: 'row', alignItems: 'center', marginVertical: SPACING.xs },
  aiGradeBig: { fontSize: FONTS.size3XL, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  aiGradeLabel: { fontSize: FONTS.sizeMD, fontWeight: FONTS.weightBold, color: COLORS.textPrimary },
  aiDecisionLabel: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightBold, letterSpacing: 0.5, marginTop: 1 },
  reviewFormWrap: { marginTop: SPACING.md },
  doctorFormHeading: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightBold, color: COLORS.textPrimary, letterSpacing: 0.5 },
  doctorFormSub: { fontSize: FONTS.sizeXS, color: COLORS.textMuted, marginBottom: SPACING.sm },
  fieldLabel: { fontSize: FONTS.sizeSM, fontWeight: FONTS.weightMedium, color: COLORS.textSecondary, marginBottom: SPACING.xs },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: SPACING.md },
  dispositionPill: {
    paddingVertical: 7,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dispositionPillActive: { backgroundColor: COLORS.accentLight, borderColor: COLORS.accent },
  pillLabel: { fontSize: FONTS.sizeXS, color: COLORS.textSecondary },
  pillLabelActive: { color: COLORS.accent, fontWeight: FONTS.weightBold },
  successBanner: {
    backgroundColor: COLORS.successLight,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.success,
    marginBottom: SPACING.md,
  },
  successBannerText: { fontSize: FONTS.sizeSM, color: COLORS.success, fontWeight: FONTS.weightSemiBold },
});
