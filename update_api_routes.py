routes_path = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\src\routes\apiRoutes.ts"

with open(routes_path, "r", encoding="utf-8") as f:
    code = f.read()

old_seg = """      segmentation: (!isRejected && segData) ? {
        id: segData.id || uuidv4(),
        image_id: '',
        vessel_coverage: segData.vessel_coverage ?? segData.vesselCoverage ?? 0,
        lesion_coverage: segData.lesion_coverage ?? segData.lesionCoverage ?? 0,
        candidate_count: segData.candidate_count ?? (segData.lesionCount ?? (segData.candidateCount ?? 0)),
        vessel_mask_url: segData.vessel_mask_url ?? '',
        lesion_mask_url: segData.lesion_mask_url ?? '',
        processing_time_ms: segData.processingTimeSec ? Math.round(segData.processingTimeSec * 1000) : 0,
        created_at: new Date().toISOString()
      } : undefined,"""

new_seg = """      segmentation: (!isRejected && segData) ? {
        id: segData.id || uuidv4(),
        image_id: '',
        vessel_coverage: segData.vessel_coverage ?? segData.vesselCoverage ?? 0,
        vesselCoverage: segData.vesselCoverage ?? segData.vessel_coverage ?? 0,
        vessel_pixels: segData.vessel_pixels ?? segData.vesselPixelCount ?? 0,
        vesselPixelCount: segData.vesselPixelCount ?? segData.vessel_pixels ?? 0,
        vessel_density: segData.vessel_density ?? segData.vesselDensity,
        vesselDensity: segData.vesselDensity ?? segData.vessel_density,
        vessel_metrics: segData.vessel_metrics ?? segData.vesselMetrics,
        vesselMetrics: segData.vesselMetrics ?? segData.vessel_metrics,
        lesion_coverage: segData.lesion_coverage ?? segData.lesionCoverage ?? 0,
        lesionCoverage: segData.lesionCoverage ?? segData.lesion_coverage ?? 0,
        candidate_count: segData.candidate_count ?? (segData.lesionCount ?? (segData.candidateCount ?? 0)),
        candidateCount: segData.candidateCount ?? segData.candidate_count ?? (segData.lesionCount ?? 0),
        totalCandidates: segData.totalCandidates ?? segData.candidateCount ?? segData.candidate_count ?? 0,
        bright_lesion_count: segData.bright_lesion_count ?? segData.brightCandidates,
        brightCandidates: segData.brightCandidates ?? segData.bright_lesion_count,
        dark_lesion_count: segData.dark_lesion_count ?? segData.darkCandidates,
        darkCandidates: segData.darkCandidates ?? segData.dark_lesion_count,
        candidateBreakdown: segData.candidateBreakdown ?? segData.candidate_breakdown,
        candidate_breakdown: segData.candidate_breakdown ?? segData.candidateBreakdown,
        neovascularization: segData.neovascularization,
        vessel_mask_url: segData.vessel_mask_url ?? '',
        lesion_mask_url: segData.lesion_mask_url ?? '',
        evidence_overlay_url: segData.evidence_overlay_url ?? segData.retinal_evidence_url ?? '',
        retinal_evidence_url: segData.retinal_evidence_url ?? segData.evidence_overlay_url ?? '',
        lesion_candidates_url: segData.lesion_candidates_url ?? '',
        evidence_json_url: segData.evidence_json_url ?? segData.evidenceJsonUrl ?? '',
        evidenceJsonUrl: segData.evidenceJsonUrl ?? segData.evidence_json_url ?? '',
        gradcam_lesion_iou: segData.gradcam_lesion_iou ?? segData.gradcamLesionIoU ?? null,
        gradcamLesionIoU: segData.gradcamLesionIoU ?? segData.gradcam_lesion_iou ?? null,
        disclaimer: segData.disclaimer,
        processing_time_ms: segData.processingTimeSec ? Math.round(segData.processingTimeSec * 1000) : 0,
        created_at: new Date().toISOString()
      } : undefined,"""

if old_seg in code:
    code = code.replace(old_seg, new_seg)
    with open(routes_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Updated apiRoutes.ts successfully!")
else:
    print("Could not find old_seg in apiRoutes.ts!")
