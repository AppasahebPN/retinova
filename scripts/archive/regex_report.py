import re

report_ts_path = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\src\services\reportService.ts"

with open(report_ts_path, "r", encoding="utf-8") as f:
    code = f.read()

pattern = r"(<!-- 5\. RETINAL VESSEL EVIDENCE -->.*?<!-- SPECIALIZED CLINICAL ASSESSMENT AUDIT -->\s*<div class=\"specialized-box avoid-break\">.*?</div>\s*</div>\s*</div>)"

repl_artifacts = """<!-- 5. RETINAL VESSEL EVIDENCE -->
      <div class="artifact-card">
        <div class="artifact-header">
          <span>5. Retinal Vessel Evidence</span>
          <span style="font-size: 11px; color: #0284c7; font-weight: 600;">Coverage: ${vesselCoverage}</span>
        </div>
        <div class="artifact-body">
          ${!isRejected && vesselSrc ? `<img src="${vesselSrc}" alt="Vessel Evidence" class="artifact-img" />` : (isRejected ? `<div style="color:#cbd5e1; padding: 60px 0; font-size: 13px;">Halted at Quality Gate</div>` : '<div style="color:#64748b; padding: 60px 0;">Vessel Map Unavailable</div>')}
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
          ${!isRejected && lesionSrc ? `<img src="${lesionSrc}" alt="Candidate Lesion Map" class="artifact-img" />` : (isRejected ? `<div style="color:#cbd5e1; padding: 60px 0; font-size: 13px;">Halted at Quality Gate</div>` : '<div style="color:#64748b; padding: 60px 0;">Lesion Map Unavailable</div>')}
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

match = re.search(pattern, code, flags=re.DOTALL)
if match:
    code = code[:match.start()] + repl_artifacts + code[match.end():]
    with open(report_ts_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Successfully replaced artifact & specialized audit sections with regex!")
else:
    print("Regex match failed. Check pattern.")
