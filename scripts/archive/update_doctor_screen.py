doctor_screen_path = r"C:\Users\Appasaheb\OneDrive\Desktop\app\mobile-app\src\screens\doctor\DoctorClinicalReviewScreen.tsx"

with open(doctor_screen_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add activeLayer state
target_state = "  // Mobile/Tablet tab switcher for narrow screens\n  const [activeTab, setActiveTab] = useState<'image' | 'evidence' | 'clinical'>('clinical');"
repl_state = """  // Mobile/Tablet tab switcher for narrow screens
  const [activeTab, setActiveTab] = useState<'image' | 'evidence' | 'clinical'>('clinical');

  // Toggleable Evidence Layers (Part 12)
  type EvidenceLayer = 'combined' | 'original' | 'enhanced' | 'gradcam' | 'vessels' | 'lesions';
  const [activeLayer, setActiveLayer] = useState<EvidenceLayer>('combined');"""

if target_state in code:
    code = code.replace(target_state, repl_state)
    print("Added activeLayer state to DoctorClinicalReviewScreen.tsx")
else:
    print("Could not find target_state!")

# 2. Update URL extraction
target_urls = """  const fundusUrl = image?.storage_url ? screeningService.fullImageUrl(image.storage_url) : null;
  const gradcamUrl = explainability?.gradcam_url ? screeningService.fullImageUrl(explainability.gradcam_url) : null;
  const vesselUrl = segmentation?.vessel_mask_url ? screeningService.fullImageUrl(segmentation.vessel_mask_url) : null;
  const lesionUrl = segmentation?.lesion_mask_url ? screeningService.fullImageUrl(segmentation.lesion_mask_url) : null;"""

repl_urls = """  const fundusUrl = image?.storage_url ? screeningService.fullImageUrl(image.storage_url) : null;
  const enhancedUrl = screening.enhancement?.enhanced_image_url ? screeningService.fullImageUrl(screening.enhancement.enhanced_image_url) : null;
  const gradcamUrl = explainability?.gradcam_url ? screeningService.fullImageUrl(explainability.gradcam_url) : null;
  const vesselUrl = segmentation?.vessel_mask_url ? screeningService.fullImageUrl(segmentation.vessel_mask_url) : null;
  const lesionUrl = segmentation?.lesion_mask_url ? screeningService.fullImageUrl(segmentation.lesion_mask_url) : null;
  const combinedEvidenceUrl = (segmentation?.retinal_evidence_url || segmentation?.evidence_overlay_url) ? screeningService.fullImageUrl(segmentation.retinal_evidence_url || segmentation.evidence_overlay_url) : null;"""

if target_urls in code:
    code = code.replace(target_urls, repl_urls)
    print("Added enhancedUrl and combinedEvidenceUrl to DoctorClinicalReviewScreen.tsx")
else:
    print("Could not find target_urls!")

# 3. Replace renderEvidencePanel
target_panel2 = """  // ----------------------------------------------------
  // PANEL 2: AI EVIDENCE & SEGMENTATION
  // ----------------------------------------------------
  const renderEvidencePanel = () => (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>AI EXPLAINABLE EVIDENCE</Text>
        <Text style={styles.panelBadge}>Swin V2 & Segmentation</Text>
      </View>

      {/* Grad-CAM Heatmap */}
      <View style={styles.evidenceBlock}>
        <Text style={styles.evidenceLabel}>Grad-CAM Class Activation Map</Text>
        <Text style={styles.evidenceCaption}>Attention focus on high-risk retinal pathological features</Text>
        {gradcamUrl ? (
          <View style={styles.evidenceImgBox}>
            <Image source={{ uri: gradcamUrl }} style={styles.evidenceImg} resizeMode="contain" />
          </View>
        ) : (
          <Text style={styles.placeholderText}>Grad-CAM map unavailable</Text>
        )}
      </View>

      {/* Retinal Vessel Segmentation */}
      <View style={styles.evidenceBlock}>
        <Text style={styles.evidenceLabel}>Retinal Vessel Segmentation</Text>
        <Text style={styles.evidenceCaption}>Morphological vessel structure & caliber segmentation</Text>
        {vesselUrl ? (
          <View style={styles.evidenceImgBox}>
            <Image source={{ uri: vesselUrl }} style={styles.evidenceImg} resizeMode="contain" />
          </View>
        ) : (
          <Text style={styles.placeholderText}>Vessel mask unavailable</Text>
        )}
      </View>

      {/* Candidate Lesion Evidence */}
      <View style={styles.evidenceBlock}>
        <Text style={[styles.evidenceLabel, { color: COLORS.decisionRecapture }]}>CANDIDATE LESION EVIDENCE</Text>
        <Text style={styles.evidenceCaption}>
          Computer vision candidate lesion proposals — labeled strictly as candidate detections, NOT confirmed clinical lesions.
        </Text>
        {lesionUrl ? (
          <View style={[styles.evidenceImgBox, { borderColor: COLORS.decisionRecapture, borderWidth: 1.5 }]}>
            <Image source={{ uri: lesionUrl }} style={styles.evidenceImg} resizeMode="contain" />
          </View>
        ) : (
          <Text style={styles.placeholderText}>Candidate lesion proposals unavailable</Text>
        )}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>CAUTION — Candidate Regions Only</Text>
          <Text style={styles.noticeText}>
            Candidate regions highlight microaneurysms, exudates, or hemorrhages for clinician review. Not an independent diagnosis.
          </Text>
        </View>
      </View>
    </View>
  );"""

repl_panel2 = """  // ----------------------------------------------------
  // PANEL 2: AI EVIDENCE & SEGMENTATION (UPGRADED)
  // ----------------------------------------------------
  const renderEvidencePanel = () => {
    // Determine active layer image and description
    let currentLayerUrl = combinedEvidenceUrl || gradcamUrl || fundusUrl;
    let currentLayerTitle = 'Combined Retinal Evidence';
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

    const nvStatus = segmentation?.neovascularization?.status;
    const nvStatusDisplay = nvStatus === 'detected'
      ? 'Detected'
      : (nvStatus === 'not_detected' ? 'Not detected' : 'Dedicated assessment not available');
    const nvMethod = segmentation?.neovascularization?.method || 'No dedicated validated NV detector available';
    const nvConfidence = segmentation?.neovascularization?.confidence;

    const gradcamLesionIoU = segmentation?.gradcam_lesion_iou ?? segmentation?.gradcamLesionIoU;
    const iouDisplay = (typeof gradcamLesionIoU === 'number')
      ? `${(gradcamLesionIoU * 100).toFixed(1)}%`
      : 'Not available';

    const vesselMetrics = segmentation?.vessel_metrics || segmentation?.vesselMetrics;
    const candidateBreakdown = segmentation?.candidate_breakdown || segmentation?.candidateBreakdown;

    return (
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>AI EVIDENCE & WORKSTATION</Text>
          <Text style={styles.panelBadge}>Module 3 & Module 5 Fusion</Text>
        </View>

        {/* Toggleable Evidence Layers (Part 12) */}
        <Text style={styles.fieldLabel}>Toggle Evidence Layer</Text>
        <View style={styles.layerSelectorRow}>
          {[
            { key: 'combined', label: 'Combined Evidence' },
            { key: 'original', label: 'Original' },
            { key: 'enhanced', label: 'Enhanced' },
            { key: 'gradcam', label: 'Grad-CAM' },
            { key: 'vessels', label: 'Vessels' },
            { key: 'lesions', label: 'Candidate Lesions' },
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
            <View style={[styles.evidenceImgBox, activeLayer === 'lesions' && { borderColor: COLORS.decisionRecapture, borderWidth: 1.5 }]}>
              <Image source={{ uri: currentLayerUrl }} style={styles.evidenceImg} resizeMode="contain" />
            </View>
          ) : (
            <View style={styles.imgPlaceholder}>
              <Text style={styles.placeholderText}>{currentLayerTitle} unavailable</Text>
            </View>
          )}
        </View>

        {/* Evidence Information Panel: Neovascularization Assessment (Part 12 & 13) */}
        <View style={styles.infoCardBlock}>
          <Text style={styles.infoCardHeading}>NEOVASCULARIZATION ASSESSMENT</Text>
          <InfoRow label="NV Detection Status" value={nvStatusDisplay} />
          {typeof nvConfidence === 'number' && (
            <InfoRow label="NV Confidence" value={`${(nvConfidence * 100).toFixed(1)}%`} />
          )}
          <InfoRow label="Assessment Method" value={nvMethod} />
          <View style={styles.nvNoticeBox}>
            <Text style={styles.nvNoticeText}>
              NV CANDIDATE EVIDENCE — NOT A CONFIRMED FINDING: Dedicated pixel-level NV detector is not available. Grade 4 classification from Swin V2 reflects whole-image deep features and does not imply automatic NV confirmation.
            </Text>
          </View>
        </View>

        {/* Evidence Information Panel: Grad-CAM <-> Lesion Spatial Alignment (Part 12) */}
        <View style={styles.infoCardBlock}>
          <Text style={styles.infoCardHeading}>GRAD-CAM ↔ LESION ALIGNMENT</Text>
          <InfoRow label="Spatial Agreement (IoU)" value={iouDisplay} />
          <Text style={styles.infoCardSubtext}>
            Intersection over Union (IoU) evaluated between thresholded Swin V2 Grad-CAM saliency activation and Module 3 candidate lesion mask.
          </Text>
        </View>

        {/* Evidence Information Panel: Candidate Lesion Evidence Breakdown */}
        <View style={styles.infoCardBlock}>
          <Text style={[styles.infoCardHeading, { color: COLORS.decisionRecapture }]}>CANDIDATE LESION EVIDENCE</Text>
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
          {vesselMetrics?.branchingComplexity !== undefined && (
            <InfoRow label="Vascular Branching" value={`${vesselMetrics.branchingComplexity} branch points`} />
          )}
          {vesselMetrics?.meanCaliber !== undefined && (
            <InfoRow label="Mean Caliber" value={`${vesselMetrics.meanCaliber} px`} />
          )}
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>CAUTION — Candidate Regions Only</Text>
            <Text style={styles.noticeText}>
              Candidate regions highlight morphological patterns for clinician review. Not an independent clinical diagnosis.
            </Text>
          </View>
        </View>
      </View>
    );
  };"""

if target_panel2 in code:
    code = code.replace(target_panel2, repl_panel2)
    print("Replaced renderEvidencePanel in DoctorClinicalReviewScreen.tsx successfully!")
else:
    print("Could not find target_panel2 in DoctorClinicalReviewScreen.tsx!")

# 4. Add new styles for layer chips and info cards
target_styles = """  evidenceImg: { width: '100%', height: 200 },"""
repl_styles = """  evidenceImg: { width: '100%', height: 200 },
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
  },"""

if target_styles in code:
    code = code.replace(target_styles, repl_styles)
    print("Added new styles to DoctorClinicalReviewScreen.tsx successfully!")
else:
    print("Could not find target_styles in DoctorClinicalReviewScreen.tsx!")

with open(doctor_screen_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Saved DoctorClinicalReviewScreen.tsx successfully!")
