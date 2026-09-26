types_path = r"C:\Users\Appasaheb\OneDrive\Documents\MATLAB\NetraAI\DR\backend\src\types\index.ts"

with open(types_path, "r", encoding="utf-8") as f:
    code = f.read()

target = """export interface SegmentationResult {
  id: string;
  image_id: string;
  vessel_coverage: number;   // percentage
  lesion_coverage: number;   // percentage
  candidate_count: number;   // count of candidate regions
  vessel_mask_url: string;
  lesion_mask_url: string;
  processing_time_ms: number;
  created_at: string;
}"""

replacement = """export interface SegmentationResult {
  id: string;
  image_id: string;
  vessel_coverage: number;   // percentage
  vesselCoverage?: number;
  vessel_pixels?: number;
  vesselPixelCount?: number;
  vessel_density?: number;
  vesselDensity?: number;
  vessel_metrics?: any;
  vesselMetrics?: any;
  lesion_coverage: number;   // percentage
  lesionCoverage?: number;
  candidate_count: number;   // count of candidate regions
  candidateCount?: number;
  totalCandidates?: number;
  bright_lesion_count?: number;
  brightCandidates?: number;
  dark_lesion_count?: number;
  darkCandidates?: number;
  candidateBreakdown?: any;
  candidate_breakdown?: any;
  neovascularization?: any;
  vessel_mask_url: string;
  lesion_mask_url: string;
  evidence_overlay_url?: string;
  retinal_evidence_url?: string;
  lesion_candidates_url?: string;
  evidence_json_url?: string;
  evidenceJsonUrl?: string;
  gradcam_lesion_iou?: number | null;
  gradcamLesionIoU?: number | null;
  disclaimer?: string;
  processing_time_ms: number;
  created_at: string;
}"""

if target in code:
    code = code.replace(target, replacement)
    with open(types_path, "w", encoding="utf-8") as f:
        f.write(code)
    print("Updated SegmentationResult in backend types!")
else:
    print("Target SegmentationResult not found in backend types!")
