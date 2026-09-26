// ============================================================
// RETINOVA — Doctor Clinical Review Workspace (Role 3)
// Figma Make Source of Truth — Polished Healthcare UI System
// ============================================================
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { screeningService } from '../../services/screeningService';
import { referralService } from '../../services/referralService';
import {
  SectionHeader,
  InfoRow,
  StatusBadge,
  PriorityBadge,
  GradeBadge,
  RetinovaLogo,
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
import type { Screening, ReferralActionTaken } from '../../types';

type EvidenceLayer = 'combined' | 'original' | 'enhanced' | 'gradcam' | 'vessels' | 'lesions';
type ReferralUrgency = 'immediate' | 'urgent' | 'routine' | 'none';

export default function DoctorClinicalReviewScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const screeningId: string = route.params?.screeningId;

  const [screening, setScreening] = useState<Screening | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Toggleable Evidence Layers (Figma Part 12)
  const [activeLayer, setActiveLayer] = useState<EvidenceLayer>('combined');

  // Doctor Clinical Outcome Form (Clinician-Entered)
  const [referralUrgency, setReferralUrgency] = useState<ReferralUrgency>('urgent');
  const [actionNotes, setActionNotes] = useState('');
  const [actionTaken, setActionTaken] = useState<ReferralActionTaken>('referral_completed');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadCase = () => {
    if (!screeningId) {
      setError('Screening ID missing from navigation.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    screeningService
      .getById(screeningId)
      .then((data) => {
        setScreening(data);
        if (data.referral?.action_taken) {
          setActionTaken(data.referral.action_taken as ReferralActionTaken);
        }
        if (data.referral?.action_notes) {
          setActionNotes(data.referral.action_notes);
        }
        const g = data.classification?.predicted_grade ?? 0;
        if (g >= 4) setReferralUrgency('immediate');
        else if (g === 3) setReferralUrgency('urgent');
        else if (g >= 1) setReferralUrgency('routine');
        else setReferralUrgency('none');
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
    if (!actionNotes.trim()) {
      Alert.alert('Disposition Required', 'Please document your clinical findings and management plan.');
      return;
    }
    setSubmitting(true);
    try {
      const urgencyNote = `[Clinician Urgency: ${referralUrgency.toUpperCase()}] ${actionNotes.trim()}`;
      await referralService.updateAction(screeningId, {
        action_taken: actionTaken,
        action_notes: urgencyNote,
      });
      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        navigation.goBack();
      }, 1500);
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Unable to record clinical review.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.teal800} size="large" />
        <Text style={styles.loadingText}>Opening Clinical Review Workstation...</Text>
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
  const enhancedUrl = screening.enhancement?.enhanced_image_url
    ? screeningService.fullImageUrl(screening.enhancement.enhanced_image_url)
    : null;
  const gradcamUrl = explainability?.gradcam_url
    ? screeningService.fullImageUrl(explainability.gradcam_url)
    : null;
  const vesselUrl = segmentation?.vessel_mask_url
    ? screeningService.fullImageUrl(segmentation.vessel_mask_url)
    : null;
  const lesionUrl = segmentation?.lesion_mask_url
    ? screeningService.fullImageUrl(segmentation.lesion_mask_url)
    : null;
  const combinedEvidenceUrl =
    segmentation?.retinal_evidence_url || segmentation?.evidence_overlay_url
      ? screeningService.fullImageUrl(segmentation.retinal_evidence_url || segmentation.evidence_overlay_url)
      : null;

  const grade = classification?.predicted_grade;
  const risk = classification?.g2plus_probability_calibrated;
  const isHighPriority = (grade ?? 0) >= 3 || referral?.priority === 'urgent';
  const priority = isHighPriority ? 'HIGH' : 'MODERATE';
  const patientName = patient?.name || 'Patient Record';
  const riskFormatted = risk !== undefined ? `${(risk * 100).toFixed(1)}%` : '--';

  // Active layer selection
  let currentLayerUrl = combinedEvidenceUrl || gradcamUrl || fundusUrl;
  let currentLayerTitle = 'Composite Retinal Evidence';
  let currentLayerSubtitle =
    'Multi-layer composite: vessels (cyan), hard exudates (yellow), microaneurysms (red), hemorrhages (magenta), optic disc (green), fovea (blue)';

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
  const iouDisplay =
    typeof gradcamLesionIoU === 'number' ? `${(gradcamLesionIoU * 100).toFixed(1)}%` : 'Not available';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Workstation Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <RetinovaLogo size="sm" />
          <View style={styles.topBadgePill}>
            <Text style={styles.topBadgeText}>Ophthalmologist Workstation</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <Text style={styles.backBtnText}>← Back to Queue</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mainContainer}>
        {/* 1. Patient Banner Card (Figma Style) */}
        <View
          style={[
            styles.patientBannerCard,
            { borderLeftColor: isHighPriority ? COLORS.maroon700 : COLORS.amber600 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <View style={styles.bannerNameRow}>
              <Text style={styles.bannerPatientName}>{patientName}</Text>
              {patient?.age ? <Text style={styles.bannerPatientAge}>{patient.age}y</Text> : null}
              <PriorityBadge priority={priority} />
            </View>
            <Text style={styles.bannerMeta}>
              {facility?.name || 'Primary Health Center'} · {screening.eye?.toUpperCase()} EYE (
              {screening.eye?.toUpperCase() === 'LEFT' ? 'OS' : 'OD'}) · Screened{' '}
              {new Date(screening.created_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
            <Text style={styles.screeningIdLabel}>Screening ID: {screening.id}</Text>
          </View>
          <GradeBadge grade={grade !== undefined ? grade : 0} risk={riskFormatted} />
        </View>

        {/* 2. Fundus Image & Evidence Viewer (Figma Black Viewer) */}
        <View style={styles.viewerSection}>
          <View style={styles.viewerHeaderRow}>
            <Text style={styles.sectionLabel}>
              Fundus Image & Evidence — {screening.eye?.toUpperCase()} Eye (
              {screening.eye?.toUpperCase() === 'LEFT' ? 'OS' : 'OD'})
            </Text>
            <Text style={styles.layerActiveTag}>{activeLayer.toUpperCase()}</Text>
          </View>

          {/* Evidence Layer Switcher Strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.layerStripScroll}
            contentContainerStyle={styles.layerStripContent}
          >
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
                style={[styles.layerTab, activeLayer === item.key && styles.layerTabActive]}
                onPress={() => setActiveLayer(item.key as EvidenceLayer)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.layerTabText,
                    activeLayer === item.key && styles.layerTabTextActive,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Viewer Container */}
          <View style={styles.blackViewer}>
            {currentLayerUrl ? (
              <Image
                source={{ uri: currentLayerUrl }}
                style={styles.viewerImage}
                resizeMode="contain"
              />
            ) : (
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderText}>{currentLayerTitle} unavailable</Text>
              </View>
            )}
          </View>
          <Text style={styles.evidenceCaptionText}>{currentLayerSubtitle}</Text>
        </View>

        {/* 3. AI Analysis Finding Callout (Figma Style) */}
        <View style={styles.aiFindingBox}>
          <Text style={styles.aiFindingTitle}>AI Analysis Finding</Text>
          <Text style={styles.aiFindingText}>
            {referral?.reason ||
              'Referable Diabetic Retinopathy features identified by Swin V2 deep neural classifier.'}
          </Text>
          <View style={styles.aiFindingMetaRow}>
            <Text style={styles.aiFindingMeta}>
              Predicted Grade: {grade !== undefined ? GRADE_SHORT[grade] : '--'}
            </Text>
            <Text style={styles.aiFindingMeta}>Calibrated Risk: {riskFormatted}</Text>
            <Text style={styles.aiFindingMeta}>Decision: {classification?.decision || 'REFER'}</Text>
          </View>
        </View>

        {/* 4. Technical Explanations (NV Assessment & Spatial Alignment) */}
        <View style={styles.technicalCard}>
          <Text style={styles.techSectionTitle}>Neovascularization Assessment</Text>
          <InfoRow label="Dedicated Assessment" value="Not available" />
          <InfoRow
            label="Reason"
            value="No dedicated validated neovascularization detector available."
          />
          <View style={styles.nvNoteBox}>
            <Text style={styles.nvNoteText}>
              Note: Grade 4 classification reflects whole-image neural network features and does
              not substitute for a dedicated pixel-level neovascularization assessment.
            </Text>
          </View>

          <View style={{ marginTop: SPACING.md }}>
            <Text style={styles.techSectionTitle}>Grad-CAM ↔ Lesion Spatial Alignment</Text>
            <InfoRow label="Spatial Agreement (IoU)" value={iouDisplay} />
            <Text style={styles.iouExplanationText}>
              IoU evaluated between Swin V2 Grad-CAM saliency activation and Module 3 candidate
              lesion mask. Scale disparity between whole-retina classifier attention (~9%) and
              punctate lesions (&lt;1%) is mathematically expected.
            </Text>
          </View>
        </View>

        {/* 5. Clinical Referral Decision 2x2 Grid (Figma Clinician-Entered) */}
        <View style={styles.decisionSection}>
          <Text style={styles.sectionLabel}>Clinical Referral Decision (Clinician-Entered)</Text>
          <View style={styles.decisionGrid}>
            {[
              { key: 'immediate', label: 'Immediate', desc: 'Within 24–48 hrs' },
              { key: 'urgent', label: 'Urgent', desc: 'Within 2 weeks' },
              { key: 'routine', label: 'Routine', desc: 'Within 4 weeks' },
              { key: 'none', label: 'No Referral', desc: 'Annual follow-up' },
            ].map((opt) => {
              const isSelected = referralUrgency === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.decisionCard, isSelected && styles.decisionCardSelected]}
                  onPress={() => setReferralUrgency(opt.key as ReferralUrgency)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.decisionLabel, isSelected && styles.decisionLabelSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.decisionDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 6. Clinical Disposition Notes (Figma Textarea) */}
        <View style={styles.dispositionSection}>
          <Text style={styles.sectionLabel}>Clinical Disposition Notes</Text>
          <TextInput
            style={styles.notesInput}
            numberOfLines={4}
            multiline
            placeholder="Document your clinical findings and recommended management plan…"
            placeholderTextColor={COLORS.textMuted}
            value={actionNotes}
            onChangeText={setActionNotes}
          />
        </View>

        {/* 7. Submit Action Buttons */}
        <View style={styles.submitActionsRow}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.75}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveBtn,
              (!actionNotes.trim() || submitting) && styles.saveBtnDisabled,
            ]}
            onPress={handleSubmitReview}
            disabled={!actionNotes.trim() || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : submitSuccess ? (
              <Text style={styles.saveBtnText}>✓ Disposition Saved</Text>
            ) : (
              <Text style={styles.saveBtnText}>Save Clinical Disposition</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 60 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { marginTop: 12, color: COLORS.slate500, fontFamily: FONT_FAMILY.body },
  errorTitle: {
    fontSize: 20,
    fontWeight: FONTS.weightBold,
    color: COLORS.maroon700,
    marginBottom: 8,
    fontFamily: FONT_FAMILY.display,
  },
  errorText: { color: COLORS.slate500, textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    backgroundColor: COLORS.teal800,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  retryBtnText: { color: '#FFFFFF', fontWeight: FONTS.weightBold },

  // Top Bar
  topBar: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  topBadgePill: {
    backgroundColor: COLORS.teal50,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.teal100,
  },
  topBadgeText: {
    fontSize: 10,
    fontWeight: FONTS.weightBold,
    color: COLORS.teal800,
    fontFamily: FONT_FAMILY.body,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backBtnText: {
    fontSize: 12,
    fontWeight: FONTS.weightSemiBold,
    color: COLORS.slate700,
    fontFamily: FONT_FAMILY.body,
  },

  mainContainer: {
    maxWidth: 880,
    width: '100%',
    alignSelf: 'center',
    padding: SPACING.lg,
    gap: 20,
  },

  // 1. Patient Banner
  patientBannerCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderLeftWidth: 4,
    borderRadius: RADIUS.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    ...SHADOWS.card,
  },
  bannerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  bannerPatientName: {
    fontSize: 20,
    fontWeight: FONTS.weightBold,
    fontFamily: FONT_FAMILY.display,
    color: COLORS.navy800,
  },
  bannerPatientAge: {
    fontSize: 14,
    color: COLORS.slate500,
    fontFamily: FONT_FAMILY.body,
  },
  bannerMeta: {
    fontSize: 12,
    color: COLORS.slate500,
    marginTop: 4,
    fontFamily: FONT_FAMILY.body,
  },
  screeningIdLabel: {
    fontSize: 10,
    color: COLORS.slate400,
    marginTop: 4,
    fontFamily: FONT_FAMILY.mono,
  },

  // 2. Viewer Section
  viewerSection: {},
  viewerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: FONTS.weightBold,
    color: COLORS.slate500,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    fontFamily: FONT_FAMILY.body,
  },
  layerActiveTag: {
    fontSize: 10,
    fontWeight: FONTS.weightBold,
    color: COLORS.teal800,
    backgroundColor: COLORS.teal50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    fontFamily: FONT_FAMILY.mono,
  },
  layerStripScroll: { maxHeight: 42, marginBottom: 10 },
  layerStripContent: { gap: 6 },
  layerTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  layerTabActive: {
    backgroundColor: COLORS.teal800,
    borderColor: COLORS.teal800,
  },
  layerTabText: {
    fontSize: 12,
    fontWeight: FONTS.weightMedium,
    color: COLORS.slate700,
    fontFamily: FONT_FAMILY.body,
  },
  layerTabTextActive: {
    color: '#FFFFFF',
    fontWeight: FONTS.weightBold,
  },
  blackViewer: {
    height: 340,
    backgroundColor: '#111111',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
  },
  viewerImage: { width: '100%', height: '100%' },
  placeholderBox: { alignItems: 'center', justifyContent: 'center' },
  placeholderText: { color: COLORS.slate400, fontStyle: 'italic', fontSize: 13 },
  evidenceCaptionText: {
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 6,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.body,
  },

  // 3. AI Finding
  aiFindingBox: {
    backgroundColor: COLORS.maroon50,
    borderWidth: 1,
    borderColor: COLORS.maroon100,
    borderRadius: RADIUS.md,
    padding: 14,
  },
  aiFindingTitle: {
    fontSize: 11,
    fontWeight: FONTS.weightBold,
    color: COLORS.maroon700,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
    fontFamily: FONT_FAMILY.body,
  },
  aiFindingText: {
    fontSize: 13,
    color: COLORS.navy700,
    lineHeight: 18,
    fontFamily: FONT_FAMILY.body,
  },
  aiFindingMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.maroon100,
    flexWrap: 'wrap',
  },
  aiFindingMeta: {
    fontSize: 11,
    color: COLORS.maroon700,
    fontWeight: FONTS.weightSemiBold,
    fontFamily: FONT_FAMILY.mono,
  },

  // 4. Technical Card
  technicalCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: RADIUS.lg,
    padding: 16,
    ...SHADOWS.card,
  },
  techSectionTitle: {
    fontSize: 12,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy800,
    marginBottom: 4,
    fontFamily: FONT_FAMILY.body,
  },
  nvNoteBox: {
    backgroundColor: COLORS.amber50,
    borderWidth: 1,
    borderColor: COLORS.amber100,
    borderRadius: RADIUS.sm,
    padding: 8,
    marginTop: 6,
  },
  nvNoteText: {
    fontSize: 11,
    color: COLORS.amber700,
    lineHeight: 16,
    fontFamily: FONT_FAMILY.body,
  },
  iouExplanationText: {
    fontSize: 11,
    color: COLORS.slate500,
    lineHeight: 16,
    marginTop: 4,
    fontFamily: FONT_FAMILY.body,
  },

  // 5. Decision Grid
  decisionSection: {},
  decisionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  decisionCard: {
    flex: 1,
    minWidth: 160,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
  },
  decisionCardSelected: {
    borderColor: COLORS.teal800,
    backgroundColor: COLORS.teal50,
  },
  decisionLabel: {
    fontSize: 13,
    fontWeight: FONTS.weightBold,
    color: COLORS.navy700,
    fontFamily: FONT_FAMILY.body,
  },
  decisionLabelSelected: {
    color: COLORS.teal800,
  },
  decisionDesc: {
    fontSize: 11,
    color: COLORS.slate500,
    marginTop: 2,
    fontFamily: FONT_FAMILY.body,
  },

  // 6. Disposition
  dispositionSection: {},
  notesInput: {
    marginTop: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 12,
    fontSize: 13,
    color: COLORS.navy800,
    minHeight: 90,
    textAlignVertical: 'top',
    fontFamily: FONT_FAMILY.body,
  },

  // 7. Submit Actions
  submitActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.teal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: FONTS.weightBold,
    color: COLORS.teal800,
    fontFamily: FONT_FAMILY.body,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.teal800,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: FONTS.weightBold,
    color: '#FFFFFF',
    fontFamily: FONT_FAMILY.body,
  },
});
