report_ts_path = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\src\services\reportService.ts"

with open(report_ts_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add extractions for Module 3 retinal evidence fields
target_seg_vars = """    const lesionUrl = screening.segmentation?.lesion_mask_url || '';
    const lesionSrc = resolveImageSrc(lesionUrl);
    const candidateCoverage = typeof screening.segmentation?.lesion_coverage === 'number'
      ? `${screening.segmentation.lesion_coverage.toFixed(2)}%`
      : (seg.lesionCoverage !== undefined ? `${seg.lesionCoverage}%` : 'Unavailable');
    const candidateCount = screening.segmentation?.candidate_count !== undefined
      ? `${screening.segmentation.candidate_count}`
      : (seg.candidateCount !== undefined ? `${seg.candidateCount}` : 'Unavailable');
    const brightCount = seg.bright_lesion_count;
    const darkCount = seg.dark_lesion_count;"""

repl_seg_vars = """    const lesionUrl = screening.segmentation?.lesion_mask_url || '';
    const lesionSrc = resolveImageSrc(lesionUrl);
    const candidateCoverage = typeof screening.segmentation?.lesion_coverage === 'number'
      ? `${screening.segmentation.lesion_coverage.toFixed(2)}%`
      : (seg.lesionCoverage !== undefined ? `${seg.lesionCoverage}%` : 'Unavailable');
    const candidateCount = screening.segmentation?.candidate_count !== undefined
      ? `${screening.segmentation.candidate_count}`
      : (seg.candidateCount !== undefined ? `${seg.candidateCount}` : 'Unavailable');
    const brightCount = seg.bright_lesion_count ?? seg.brightCandidates;
    const darkCount = seg.dark_lesion_count ?? seg.darkCandidates;

    // Upgraded Module 3 Retinal Evidence Fields
    const retinalEvidenceUrl = seg.retinal_evidence_url || seg.evidence_overlay_url || '';
    const retinalEvidenceSrc = resolveImageSrc(retinalEvidenceUrl);

    const vesselMetrics = seg.vessel_metrics || seg.vesselMetrics || {};
    const branchingComplexity = vesselMetrics.branchingComplexity !== undefined ? `${vesselMetrics.branchingComplexity} branch points` : (seg.branchingComplexity !== undefined ? `${seg.branchingComplexity} branch points` : 'Unavailable');
    const meanCaliber = vesselMetrics.meanCaliber !== undefined ? `${vesselMetrics.meanCaliber} px` : (seg.meanCaliber !== undefined ? `${seg.meanCaliber} px` : 'Unavailable');
    const vesselDensity = vesselMetrics.density !== undefined ? `${(vesselMetrics.density * 100).toFixed(2)}%` : (seg.vessel_density !== undefined ? `${(seg.vessel_density * 100).toFixed(2)}%` : 'Unavailable');
    const vesselPixels = vesselMetrics.pixelCount ?? seg.vessel_pixels ?? seg.vesselPixelCount;

    const candidateBreakdown = seg.candidate_breakdown || seg.candidateBreakdown || {};
    const maCandidates = candidateBreakdown.microaneurysmCandidates ?? seg.maCount;
    const heCandidates = candidateBreakdown.hemorrhageCandidates ?? seg.heCount;
    const exCandidates = candidateBreakdown.hardExudateCandidates ?? seg.exCount;
    const seCandidates = candidateBreakdown.softExudateCandidates ?? seg.seCount;
    const csmeRisk = candidateBreakdown.csmeRiskCandidateFlag ?? seg.exCsmeRiskFlag;
    const exMacular = candidateBreakdown.macularProximityExudates ?? seg.exMacularProximityCount;

    const nvInfo = seg.neovascularization || {};
    const nvStatus = (nvInfo.status || 'unavailable').toUpperCase();
    const nvMethod = nvInfo.method || 'No dedicated validated NV detector available';
    const nvCandidateEvidence = nvInfo.candidateEvidence || 'NV CANDIDATE EVIDENCE — NOT A CONFIRMED FINDING: No validated pixel-level detector in repository';

    const gradcamLesionIoU = seg.gradcam_lesion_iou ?? seg.gradcamLesionIoU ?? screening.explainability?.gradcam_lesion_iou ?? (screening.explainability as any)?.gradcamLesionIoU ?? null;
    const gradcamLesionIoUDisplay = (typeof gradcamLesionIoU === 'number') ? `${(gradcamLesionIoU * 100).toFixed(1)}% spatial overlap (IoU = ${gradcamLesionIoU.toFixed(4)})` : 'Not available';

    const evidenceJsonUrl = seg.evidence_json_url || seg.evidenceJsonUrl || `/uploads/retinal_evidence_${screening.id?.slice(0, 8)}.json`;
    const candidatesJsonUrl = seg.lesion_candidates_url || `/uploads/lesion_candidates_${screening.id?.slice(0, 8)}.json`;"""

if target_seg_vars in code:
    code = code.replace(target_seg_vars, repl_seg_vars)
    print("Added upgraded Module 3 extractions to reportService.ts")
else:
    print("Could not find target_seg_vars in reportService.ts!")

# 2. Upgrade the artifact card rendering and specialized assessment box
target_artifacts = """      <!-- 5. RETINAL VESSEL EVIDENCE -->
      <div class="artifact-card">
        <div class="artifact-header">
          <span>5. Retinal Vessel Evidence</span>
          <span style="font-size: 11px; color: #0284c7; font-weight: 600;">Coverage: ${vesselCoverage}</span>
        </div>
        <div class="artifact-body">
          ${!isRejected && vesselSrc ? `<img src="${vesselSrc}" alt="Vessel Evidence" class="artifact-img" />` : (isRejected ? `<div style="color:#cbd5e1; padding: 60px 0; font-size: 13px;"><div style="font-size: 24px; margin-bottom: 6px;">⚠️</div>Halted at Quality Gate</div>` : '<div style="color:#64748b; padding: 60px 0;">Vessel Map Unavailable</div>')}
        </div>
        <div class="artifact-footer">
          <strong>Vessel Coverage:</strong> ${vesselCoverage} | Morphological vascular structure extracted by MATLAB Module 3.
        </div>
      </div>

      <!-- 6. CANDIDATE LESION EVIDENCE -->
      <div class="artifact-card">
        <div class="artifact-header">
          <span>6. Candidate Lesion Evidence</span>
          <span style="font-size: 11px; color: #d97706; font-weight: 600;">${candidateCount} Candidates</span>
        </div>
        <div class="artifact-body">
          ${!isRejected && lesionSrc ? `<img src="${lesionSrc}" alt="Candidate Lesion Map" class="artifact-img" />` : (isRejected ? `<div style="color:#cbd5e1; padding: 60px 0; font-size: 13px;"><div style="font-size: 24px; margin-bottom: 6px;">⚠️</div>Halted at Quality Gate</div>` : '<div style="color:#64748b; padding: 60px 0;">Lesion Map Unavailable</div>')}
        </div>
        <div class="artifact-footer">
          <strong>Candidate Lesion Coverage:</strong> ${candidateCoverage} | <strong>Candidate Count:</strong> ${candidateCount}<br/>
          ${brightCount !== undefined || darkCount !== undefined ? `Bright candidates: <strong>${brightCount ?? 0}</strong> | Dark candidates: <strong>${darkCount ?? 0}</strong><br/>` : ''}
          <span style="font-size: 11px; color: #64748b;">* Candidate regions segmented by MATLAB Module 3 represent morphological patterns for clinician review and do not constitute independent diagnostic proof.</span>
        </div>
      </div>
    </div>
  </div>

  <!-- SPECIALIZED CLINICAL ASSESSMENT AUDIT -->
  <div class="specialized-box avoid-break">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div>
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b;">Neovascularization</div>
        <div style="font-size: 13px; font-weight: 600; color: #334155; margin-top: 2px;">
          Dedicated assessment: <em>Not available</em>
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
          * The current pipeline evaluates DR grade and morphological candidate lesions; a dedicated NV classifier is not implemented.
        </div>
      </div>
      <div>
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b;">Evidence Alignment (Grad-CAM → Lesion Mask)</div>
        <div style="font-size: 13px; font-weight: 600; color: #334155; margin-top: 2px;">
          Evidence alignment: <em>Not available</em>
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
          * Spatial overlap metrics are generated when dedicated lesion masks align with class attribution heatmaps.
        </div>
      </div>
    </div>
  </div>"""

repl_artifacts = """      <!-- 5. RETINAL VESSEL EVIDENCE -->
      <div class="artifact-card">
        <div class="artifact-header">
          <span>5. Retinal Vessel Evidence</span>
          <span style="font-size: 11px; color: #0284c7; font-weight: 600;">Coverage: ${vesselCoverage}</span>
        </div>
        <div class="artifact-body">
          ${!isRejected && vesselSrc ? `<img src="${vesselSrc}" alt="Vessel Evidence" class="artifact-img" />` : (isRejected ? `<div style="color:#cbd5e1; padding: 60px 0; font-size: 13px;"><div style="font-size: 24px; margin-bottom: 6px;">⚠️</div>Halted at Quality Gate</div>` : '<div style="color:#64748b; padding: 60px 0;">Vessel Map Unavailable</div>')}
        </div>
        <div class="artifact-footer">
          <strong>Vessel Coverage:</strong> ${vesselCoverage} ${vesselPixels ? `(${vesselPixels.toLocaleString()} px)` : ''}<br/>
          <strong>Vascular Morphology:</strong> Branching: <strong>${branchingComplexity}</strong> | Mean Caliber: <strong>${meanCaliber}</strong> | Density: <strong>${vesselDensity}</strong>
        </div>
      </div>

      <!-- 6. CANDIDATE LESION EVIDENCE -->
      <div class="artifact-card">
        <div class="artifact-header">
          <span>6. Candidate Lesion Evidence</span>
          <span style="font-size: 11px; color: #d97706; font-weight: 600;">${candidateCount} Candidates</span>
        </div>
        <div class="artifact-body">
          ${!isRejected && lesionSrc ? `<img src="${lesionSrc}" alt="Candidate Lesion Map" class="artifact-img" />` : (isRejected ? `<div style="color:#cbd5e1; padding: 60px 0; font-size: 13px;"><div style="font-size: 24px; margin-bottom: 6px;">⚠️</div>Halted at Quality Gate</div>` : '<div style="color:#64748b; padding: 60px 0;">Lesion Map Unavailable</div>')}
        </div>
        <div class="artifact-footer">
          <strong>Candidate Lesion Coverage:</strong> ${candidateCoverage} | <strong>Total Candidates:</strong> ${candidateCount}<br/>
          Bright candidates: <strong>${brightCount ?? 0}</strong> (EX: ${exCandidates ?? '--'}, SE: ${seCandidates ?? '--'}) | Dark candidates: <strong>${darkCount ?? 0}</strong> (MA: ${maCandidates ?? '--'}, HE: ${heCandidates ?? '--'})<br/>
          ${csmeRisk ? `<span style="color: #b91c1c; font-weight: 600;">CSME Risk Indicator:</span> ${exMacular ?? 0} exudate candidates within 1 DD of macula.<br/>` : ''}
          <span style="font-size: 11px; color: #64748b;">* Candidate regions segmented by MATLAB Module 3 represent morphological patterns for clinician review and do not constitute independent diagnostic proof.</span>
        </div>
      </div>
    </div>

    <!-- 7. UNIFIED RETINAL EVIDENCE MAP -->
    ${!isRejected && retinalEvidenceSrc ? `
    <div class="artifact-card avoid-break" style="margin-top: 10px;">
      <div class="artifact-header" style="background: #0f172a; color: #38bdf8;">
        <span>7. Retinal Abnormality Map (Module 3 Multi-Layer Composite Evidence)</span>
        <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">Spatial Resolution: Aligned to Native Fundus</span>
      </div>
      <div class="artifact-body">
        <img src="${retinalEvidenceSrc}" alt="Retinal Abnormality Map" class="artifact-img" />
      </div>
      <div class="artifact-footer" style="background: #f8fafc;">
        <div style="display: flex; gap: 16px; flex-wrap: wrap; font-size: 11.5px; margin-bottom: 4px;">
          <span><strong style="color: #06b6d4;">■ Cyan:</strong> Retinal Vessels</span>
          <span><strong style="color: #eab308;">■ Yellow:</strong> Hard Exudates (EX)</span>
          <span><strong style="color: #ef4444;">■ Red:</strong> Microaneurysms (MA)</span>
          <span><strong style="color: #d946ef;">■ Magenta:</strong> Hemorrhages (HE)</span>
          <span><strong style="color: #22c55e;">■ Green:</strong> Optic Disc Contour</span>
          <span><strong style="color: #3b82f6;">✚ Blue:</strong> Fovea Center</span>
        </div>
        <span style="font-size: 11px; color: #64748b;">
          * Multi-layer composite synthesized from validated morphological matched filter and anatomical landmark detection. Original masks remain independently accessible.
        </span>
      </div>
    </div>
    ` : ''}
  </div>

  <!-- SPECIALIZED CLINICAL ASSESSMENT AUDIT -->
  <div class="specialized-box avoid-break">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div>
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b;">Neovascularization Assessment</div>
        <div style="font-size: 13px; font-weight: 700; color: ${nvStatus === 'DETECTED' ? '#b91c1c' : '#475569'}; margin-top: 2px;">
          Dedicated Assessment: <em>${nvStatus === 'UNAVAILABLE' ? 'Not available' : nvStatus}</em>
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.4;">
          <strong>Method:</strong> ${nvMethod}<br/>
          <span style="color: #b45309;">${nvCandidateEvidence}</span><br/>
          * Grade 4 / Proliferative DR classification from Module 4 reflects neural network whole-image features and does NOT substitute for a pixel-validated neovascularization detector.
        </div>
      </div>
      <div>
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b;">Evidence Alignment (Grad-CAM ↔ Candidate Lesion Mask)</div>
        <div style="font-size: 13px; font-weight: 700; color: #0f766e; margin-top: 2px;">
          Spatial Agreement: <em>${gradcamLesionIoUDisplay}</em>
        </div>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px; line-height: 1.4;">
          Spatial intersection-over-union (IoU) evaluated between thresholded Swin V2 Grad-CAM activation and Module 3 candidate lesion mask.<br/>
          <div style="margin-top: 6px;">
            <strong>Machine-Readable Evidence:</strong>
            <a href="${evidenceJsonUrl}" target="_blank" style="color: #0f766e; text-decoration: underline; margin-right: 8px;">retinal_evidence.json</a>
            <a href="${candidatesJsonUrl}" target="_blank" style="color: #0f766e; text-decoration: underline;">lesion_candidates.json</a>
          </div>
        </div>
      </div>
    </div>
  </div>"""

if target_artifacts in code:
    code = code.replace(target_artifacts, repl_artifacts)
    print("Replaced artifact and specialized assessment section in reportService.ts!")
else:
    print("Could not find exact target_artifacts in reportService.ts!")

with open(report_ts_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Saved reportService.ts successfully!")
