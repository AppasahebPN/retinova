import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { DatabaseStore } from '../db/store';
import { Screening } from '../types';

const execFileAsync = promisify(execFile);

function resolveImageSrc(urlOrPath: string | undefined | null): string {
  if (!urlOrPath) return '';
  if (urlOrPath.startsWith('data:')) return urlOrPath;

  const filename = path.basename(urlOrPath.replace(/\\/g, '/').split('?')[0]);
  if (!filename) return urlOrPath;

  const repoRoot = path.resolve(__dirname, '../../../../');
  const matlabRoot = path.join(repoRoot, 'DR_Screening_MATLAB');

  const candidateDirs = [
    path.join(__dirname, '../../uploads'),
    path.join(__dirname, '../../../uploads'),
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), '../uploads'),
    path.join(process.cwd(), 'backend/uploads'),
    path.join(matlabRoot, 'data/EyeQ/figure'),
    path.join(matlabRoot, 'data/APTOS/train_images'),
    path.join(matlabRoot, 'data/EyePACS/download/train/extracted/train'),
    path.join(matlabRoot, 'data/EyePACS/train_images'),
    path.join(repoRoot, 'DR_Screening_MATLAB/data/EyeQ/figure'),
    path.join(repoRoot, 'DR_Screening_MATLAB/data/APTOS/train_images'),
    path.join(repoRoot, 'DR_Screening_MATLAB/data/EyePACS/download/train/extracted/train'),
    path.join(process.cwd(), 'dataset'),
    path.join(process.cwd(), '../dataset')
  ];

  for (const dir of candidateDirs) {
    const fullPath = path.join(dir, filename);
    try {
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        const ext = path.extname(fullPath).toLowerCase().replace('.', '') || 'png';
        const mime = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : (ext === 'svg' ? 'image/svg+xml' : 'image/png');
        const b64 = fs.readFileSync(fullPath).toString('base64');
        return `data:${mime};base64,${b64}`;
      }
    } catch {
      // Continue to next candidate
    }
  }

  try {
    if (fs.existsSync(urlOrPath) && fs.statSync(urlOrPath).isFile()) {
      const ext = path.extname(urlOrPath).toLowerCase().replace('.', '') || 'png';
      const mime = (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' : (ext === 'svg' ? 'image/svg+xml' : 'image/png');
      const b64 = fs.readFileSync(urlOrPath).toString('base64');
      return `data:${mime};base64,${b64}`;
    }
  } catch {
    // Continue
  }

  if (urlOrPath.startsWith('/uploads/') || urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://')) {
    return urlOrPath;
  }
  return `/uploads/${filename}`;
}

export class ReportService {
  private store: DatabaseStore;

  constructor() {
    this.store = DatabaseStore.getInstance();
  }

  public async generateReportCard(screeningId: string): Promise<Buffer> {
    const pythonExe = 'C:\\Users\\Appasaheb\\AppData\\Local\\Programs\\Python\\Python313\\python.exe';
    const scriptPath = path.resolve(__dirname, '../../generate_card.py');
    const outPath = path.resolve(__dirname, `../../uploads/card_${screeningId}.png`);

    try {
      await execFileAsync(pythonExe, [scriptPath, screeningId, outPath], {
        cwd: path.resolve(__dirname, '../../')
      });
      if (fs.existsSync(outPath)) {
        return fs.readFileSync(outPath);
      }
    } catch (err) {
      console.error(`Error generating clinical report card for ${screeningId}:`, err);
    }
    throw new Error(`Failed to generate 1200x750 report card for screening ${screeningId}`);
  }

  public generateReportHtml(screening: Screening): string {
    const isRejected = (
      screening.status === 'rejected' ||
      screening.final_decision === 'RECAPTURE' ||
      (screening.quality?.decision || '').toLowerCase() === 'reject' ||
      (screening.quality?.status || '').toLowerCase() === 'rejected'
    );

    const clf: any = screening.classification || {};
    const grade = (typeof clf.predicted_grade === 'number')
      ? clf.predicted_grade
      : (typeof clf.grade === 'number' ? clf.grade : null);

    const gradeLabels: { [key: number]: string } = {
      0: 'Grade 0 — No Apparent DR',
      1: 'Grade 1 — Mild Non-Proliferative DR',
      2: 'Grade 2 — Moderate Non-Proliferative DR',
      3: 'Grade 3 — Severe Non-Proliferative DR',
      4: 'Grade 4 — Proliferative DR'
    };

    const fullGradeLabels: { [key: number]: string } = {
      0: 'No Apparent Retinopathy',
      1: 'Mild Non-Proliferative Diabetic Retinopathy',
      2: 'Moderate Non-Proliferative Diabetic Retinopathy',
      3: 'Severe Non-Proliferative Diabetic Retinopathy',
      4: 'Proliferative Diabetic Retinopathy'
    };

    const pCalibrated = (typeof clf.calibrated_p_g2plus === 'number')
      ? clf.calibrated_p_g2plus
      : (typeof clf.calibrated_confidence === 'number'
        ? (clf.calibrated_confidence <= 1.0 ? clf.calibrated_confidence : clf.calibrated_confidence / 100.0)
        : (typeof clf.raw_probability === 'number' ? clf.raw_probability : undefined));

    const thresholdVal = clf.threshold ?? 0.2993;

    // CANONICAL PERSISTED DECISION
    const rawDecision = clf.decision || screening.final_decision;
    let decision: 'REFER' | 'SCREEN' | 'RECAPTURE' = 'SCREEN';
    if (isRejected) {
      decision = 'RECAPTURE';
    } else if (rawDecision === 'REFER') {
      decision = 'REFER';
    } else if (rawDecision === 'SCREEN' || rawDecision === 'SCREEN_WITH_QUALITY_FLAG') {
      decision = 'SCREEN';
    } else {
      decision = (screening.final_decision === 'REFER' ? 'REFER' : 'SCREEN');
    }

    // Patient Demographics
    const patient = screening.patient;
    const patientCode = patient?.patient_code || '';
    const patientName = patient?.name || '';
    const patientAge = (patient?.age !== undefined && patient.age !== null && String(patient.age).trim() !== '') ? `${patient.age} Yrs` : '';
    const patientSex = patient?.gender || '';
    const screeningCentre = screening.facility?.name || '';
    const cameraDevice = screening.image?.device_id || '';
    const technician = (screening as any).technician_name || (screening as any).technician || (screening as any).operator || '';
    const encounterNotes = screening.notes || '';

    const screeningDate = new Date(screening.created_at || Date.now()).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const screeningIdDisplay = screening.id ? screening.id.slice(0, 8).toUpperCase() : 'UNASSIGNED';

    // Eye Resolution
    const eyeRaw = (screening.eye || '').trim().toLowerCase();
    let eyeImagedLabel = '';
    if (eyeRaw === 'left') {
      eyeImagedLabel = 'Left Eye (OS)';
    } else if (eyeRaw === 'right') {
      eyeImagedLabel = 'Right Eye (OD)';
    } else if (eyeRaw) {
      eyeImagedLabel = eyeRaw.toUpperCase();
    }

    // Referral priority and recommended action
    const ref: any = screening.referral || {};
    let referralPriority = '';
    if (ref.priority) {
      referralPriority = String(ref.priority).toUpperCase();
    } else if (decision === 'REFER') {
      referralPriority = (grade !== null && grade >= 3) ? 'PRIORITY' : 'ROUTINE';
    }

    let clinicalAction = '';
    if (decision === 'REFER') {
      clinicalAction = ref.recommended_action || 'Ophthalmologist review recommended.';
    } else if (decision === 'SCREEN') {
      clinicalAction = 'Continue routine annual diabetic eye screening according to clinical protocol.';
    } else {
      clinicalAction = 'Optical quality criteria not met. Retinal recapture required.';
    }

    // Calibrated probability string
    const pCalibratedDisplay = typeof clf.calibrated_confidence === 'number'
      ? `${clf.calibrated_confidence}%`
      : (typeof pCalibrated === 'number' ? `${(pCalibrated * 100).toFixed(2)}%` : 'Unavailable');

    // Secondary 5-grade probabilities for technical details
    let rawProbabilities: number[] = [];
    if (Array.isArray(clf.classProbabilities) && clf.classProbabilities.length > 0) {
      rawProbabilities = Array.isArray(clf.classProbabilities[0]) ? clf.classProbabilities[0] : clf.classProbabilities;
    } else if (Array.isArray(clf.grade_probabilities) && clf.grade_probabilities.length > 0) {
      rawProbabilities = Array.isArray(clf.grade_probabilities[0]) ? clf.grade_probabilities[0] : clf.grade_probabilities;
    }

    const sum5ClassG2Plus = (rawProbabilities.length >= 5)
      ? (rawProbabilities[2] + rawProbabilities[3] + rawProbabilities[4])
      : null;
    const sum5ClassG2PlusDisplay = sum5ClassG2Plus !== null ? `${(sum5ClassG2Plus * 100).toFixed(1)}%` : 'Unavailable';

    // Borderline / close classification check
    let closeClassificationNote = '';
    if (!isRejected && rawProbabilities.length >= 5) {
      const sortedProbs = [...rawProbabilities].sort((a, b) => b - a);
      const probMargin = sortedProbs[0] - sortedProbs[1];
      if (probMargin < 0.10) {
        closeClassificationNote = 'Classification Note: Top two severity probabilities are relatively close (margin < 10%).';
      }
    }

    // Image Quality Gate Data (Module 1 EyeQ)
    const q: any = screening.quality || {};
    const qualityStatus = (q.status || q.decision || (isRejected ? 'rejected' : 'accepted')).toUpperCase();
    const qualityScore = q.quality_score !== undefined
      ? `${q.quality_score}%`
      : (typeof q.confidence === 'number' ? `${(q.confidence * 100).toFixed(1)}%` : 'Unavailable');
    const fovCoverage = q.fov_coverage !== undefined
      ? `${q.fov_coverage}%`
      : (q.fovCoverage !== undefined ? `${q.fovCoverage}%` : 'Unavailable');
    const artifactStatus = q.artifact_type || q.artifactType || 'No Major Artifact';
    const qualityExplanation = q.explanation || (isRejected ? 'Optical quality criteria not met. Retinal recapture required.' : 'Image quality meets criteria for automated screening.');

    // Visual Artifacts
    const originalUrl = screening.image?.storage_url || (screening as any).imagePath || (screening as any).imageUrl || screening.image?.original_filename || '';
    const originalSrc = resolveImageSrc(originalUrl);

    const enhancedUrl = screening.enhancement?.enhanced_image_url || (screening as any).enhancedImageUrl || '';
    const enhancedSrc = resolveImageSrc(enhancedUrl);

    const seg: any = screening.segmentation || {};
    const vesselUrl = screening.segmentation?.vessel_mask_url || '';
    const vesselSrc = resolveImageSrc(vesselUrl);
    const vesselCoverage = typeof screening.segmentation?.vessel_coverage === 'number'
      ? `${screening.segmentation.vessel_coverage.toFixed(2)}%`
      : (seg.vesselCoverage !== undefined ? `${seg.vesselCoverage}%` : 'Unavailable');

    const lesionUrl = screening.segmentation?.lesion_mask_url || '';
    const lesionSrc = resolveImageSrc(lesionUrl);
    const candidateCoverage = typeof screening.segmentation?.lesion_coverage === 'number'
      ? `${screening.segmentation.lesion_coverage.toFixed(2)}%`
      : (seg.lesionCoverage !== undefined ? `${seg.lesionCoverage}%` : 'Unavailable');
    const candidateCount = screening.segmentation?.candidate_count !== undefined
      ? `${screening.segmentation.candidate_count}`
      : (seg.candidateCount !== undefined ? `${seg.candidateCount}` : 'Unavailable');
    const brightCount = seg.bright_lesion_count ?? seg.brightCandidates;
    const darkCount = seg.dark_lesion_count ?? seg.darkCandidates;

    // Module 3 Retinal Evidence Fields
    const retinalEvidenceUrl = seg.retinal_evidence_url || seg.evidence_overlay_url || '';
    const retinalEvidenceSrc = resolveImageSrc(retinalEvidenceUrl);

    const vesselMetrics = seg.vessel_metrics || seg.vesselMetrics || {};
    const branchingVal = vesselMetrics.junctionClusters ?? vesselMetrics.branchingComplexity ?? seg.junctionClusters ?? seg.branchingComplexity;
    const junctionsDisplay = (typeof branchingVal === 'number')
      ? `${branchingVal} native-scale pruned junction clusters`
      : 'Unavailable';
    const meanCaliber = vesselMetrics.meanCaliber !== undefined ? `${vesselMetrics.meanCaliber} px` : (seg.meanCaliber !== undefined ? `${seg.meanCaliber} px` : 'Unavailable');
    const vesselDensity = vesselMetrics.density !== undefined ? `${(vesselMetrics.density * 100).toFixed(2)}%` : (seg.vessel_density !== undefined ? `${(seg.vessel_density * 100).toFixed(2)}%` : 'Unavailable');

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

    const gradcamLesionIoU = seg.gradcam_lesion_iou ?? seg.gradcamLesionIoU ?? (screening.explainability as any)?.gradcam_lesion_iou ?? (screening.explainability as any)?.gradcamLesionIoU ?? null;
    const gradcamLesionIoUDisplay = (typeof gradcamLesionIoU === 'number') ? `${(gradcamLesionIoU * 100).toFixed(1)}% spatial overlap (IoU = ${gradcamLesionIoU.toFixed(4)})` : 'Not available';

    const evidenceJsonUrl = seg.evidence_json_url || seg.evidenceJsonUrl || `/uploads/retinal_evidence_${screening.id?.slice(0, 8)}.json`;
    const candidatesJsonUrl = seg.lesion_candidates_url || `/uploads/lesion_candidates_${screening.id?.slice(0, 8)}.json`;

    const gradcamUrl = screening.explainability?.gradcam_url || (screening as any).gradcamUrl || '';
    const gradcamSrc = resolveImageSrc(gradcamUrl);
    const executionEnvironment = screening.explainability?.executionEnvironment || (screening.explainability as any)?.execution_environment || 'PyTorch AMP FP16';

    console.log(`\n[DOCTOR CLINICAL REPORT GENERATED]\nscreeningId=${screening.id}\ngrade=${grade !== null ? 'G' + grade : 'REJECT'}\nrisk=${pCalibratedDisplay}\ndecision=${decision}\n`);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RETINOVA Clinical Screening Report — REP-${screeningIdDisplay}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #14202E;
      background: #f8fafc;
      margin: 0;
      padding: 24px;
      line-height: 1.5;
      font-size: 13.5px;
    }
    .report-container {
      max-width: 960px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #DCD6C9;
      border-radius: 10px;
      padding: 32px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }
    .top-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 20px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s ease;
    }
    .btn-primary { background: #1B6357; color: #ffffff; }
    .btn-primary:hover { background: #144d43; }
    .btn-secondary { background: #FFFDF8; color: #1B6357; border-color: #1B6357; }
    .btn-secondary:hover { background: #F2EAD9; }

    /* Top Brand Header */
    .brand-header {
      border-bottom: 2px solid #1B6357;
      padding-bottom: 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #14202E;
    }
    .brand-sub {
      font-size: 12px;
      font-weight: 600;
      color: #5C6672;
      margin-top: 2px;
      letter-spacing: 0.3px;
      text-transform: uppercase;
    }
    .report-meta-box {
      text-align: right;
    }
    .report-id {
      font-size: 14px;
      font-weight: 700;
      color: #1B6357;
    }
    .report-date {
      font-size: 12px;
      color: #5C6672;
      margin-top: 3px;
    }

    /* 1. VISUALLY DOMINANT CLINICAL RESULT CARD */
    .clinical-result-card {
      border-radius: 10px;
      padding: 22px 24px;
      margin-bottom: 20px;
      border-width: 1.5px;
      border-style: solid;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }
    .card-refer {
      background: #FFFDF8;
      border-color: #9C3B3B;
      border-left-width: 6px;
    }
    .card-screen {
      background: #FFFDF8;
      border-color: #1B6357;
      border-left-width: 6px;
    }
    .card-recapture {
      background: #FFFDF8;
      border-color: #C1652F;
      border-left-width: 6px;
    }
    .badge-dominant {
      display: inline-block;
      padding: 12px 26px;
      border-radius: 8px;
      font-size: 30px;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-align: center;
      color: #ffffff;
      min-width: 180px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.12);
    }
    .badge-refer { background: #9C3B3B; }
    .badge-screen { background: #1B6357; }
    .badge-recapture { background: #C1652F; }

    .result-primary-title {
      font-size: 20px;
      font-weight: 800;
      line-height: 1.25;
    }
    .title-refer { color: #9C3B3B; }
    .title-screen { color: #1B6357; }
    .title-recapture { color: #C1652F; }

    .result-primary-sub {
      font-size: 14.5px;
      font-weight: 700;
      color: #334155;
      margin-top: 4px;
    }
    .result-details {
      margin-top: 10px;
      font-size: 13.5px;
      line-height: 1.6;
    }
    .prob-tag {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5C6672;
      background: #F2EAD9;
      padding: 2px 7px;
      border-radius: 4px;
      margin-right: 6px;
    }

    /* Section Boxes */
    .section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #14202E;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 13px;
      background: #1B6357;
      border-radius: 2px;
    }
    .content-box {
      background: #ffffff;
      border: 1px solid #DCD6C9;
      border-radius: 8px;
      padding: 18px;
      margin-bottom: 20px;
    }

    /* Metadata Grid */
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
    }
    .grid-meta {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 12px 18px;
    }
    .meta-item {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: #5C6672;
      letter-spacing: 0.3px;
    }
    .meta-value {
      font-size: 13.5px;
      font-weight: 600;
      color: #14202E;
      margin-top: 2px;
    }

    /* Image Quality Gate */
    .qg-status-pill {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 4px;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .qg-pass { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .qg-fail { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

    /* Visual Artifact Cards */
    .artifact-card {
      background: #ffffff;
      border: 1px solid #DCD6C9;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .artifact-header {
      background: #FFFDF8;
      padding: 10px 14px;
      font-weight: 700;
      font-size: 12.5px;
      color: #14202E;
      border-bottom: 1px solid #DCD6C9;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .artifact-body {
      padding: 12px;
      text-align: center;
      background: #0f172a;
      min-height: 220px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .artifact-img {
      max-width: 100%;
      max-height: 240px;
      height: auto;
      object-fit: contain;
      border-radius: 4px;
      display: inline-block;
      vertical-align: middle;
    }
    .artifact-footer {
      padding: 10px 14px;
      background: #FFFDF8;
      border-top: 1px solid #DCD6C9;
      font-size: 12px;
      color: #5C6672;
      line-height: 1.5;
    }

    /* Key Findings Box */
    .findings-box {
      background: #FFFDF8;
      border: 1px solid #DCD6C9;
      border-left: 4px solid #1B6357;
      border-radius: 0 8px 8px 0;
      padding: 16px 20px;
      margin-bottom: 20px;
    }
    .findings-list {
      margin: 6px 0 0 18px;
      padding: 0;
      font-size: 13px;
      color: #14202E;
      line-height: 1.6;
    }

    /* Action Card */
    .action-card {
      padding: 16px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      border: 1px solid #DCD6C9;
      background: #FFFDF8;
    }
    .action-refer {
      border-left: 4px solid #9C3B3B;
      color: #9C3B3B;
    }
    .action-screen {
      border-left: 4px solid #1B6357;
      color: #1B6357;
    }
    .action-recapture {
      border-left: 4px solid #C1652F;
      color: #C1652F;
    }

    /* Clinician Review Box */
    .review-box {
      background: #ffffff;
      border: 1px solid #DCD6C9;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1px solid #DCD6C9;
    }
    .sig-line {
      width: 220px;
      border-top: 1px solid #5C6672;
      margin-top: 36px;
      text-align: center;
      font-size: 11.5px;
      color: #5C6672;
    }

    /* Disclaimer */
    .disclaimer {
      padding: 12px 16px;
      background: #FFFDF8;
      border: 1px solid #DCD6C9;
      border-left: 3.5px solid #1B6357;
      border-radius: 6px;
      font-size: 11.5px;
      color: #5C6672;
      line-height: 1.5;
      margin-bottom: 20px;
    }

    /* Technical Appendix Box (Collapsible) */
    .tech-details-box {
      background: #f8fafc;
      border: 1px solid #DCD6C9;
      border-radius: 8px;
      padding: 14px 18px;
      margin-top: 24px;
    }

    /* Secondary 5-grade table inside tech details */
    .severity-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-top: 8px;
    }
    .severity-table th, .severity-table td {
      padding: 6px 10px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    .severity-table th {
      background: #F2EAD9;
      font-weight: 700;
      color: #14202E;
    }
    .severity-active-row {
      background: #eef2ff;
      font-weight: 700;
      color: #1B6357;
    }
    .prob-bar-container {
      background: #e2e8f0;
      border-radius: 999px;
      height: 7px;
      width: 110px;
      overflow: hidden;
      display: inline-block;
      vertical-align: middle;
      margin-right: 6px;
    }
    .prob-bar {
      height: 100%;
      background: #1B6357;
      border-radius: 999px;
    }

    /* Print & Page Layout */
    .page-break { page-break-after: always; break-after: page; }
    .avoid-break { page-break-inside: avoid; break-inside: avoid; }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
        margin: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .report-container {
        max-width: 100%;
        border: none;
        box-shadow: none;
        padding: 0;
      }
      .no-print { display: none !important; }
      .avoid-break { page-break-inside: avoid; break-inside: avoid; }
      @page { size: A4 portrait; margin: 12mm; }
    }
  </style>
</head>
<body>

<div class="report-container">
  <!-- Top Action Bar (hidden on print) -->
  <div class="top-actions no-print">
    <button onclick="window.print()" class="btn btn-primary">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      Print / Save PDF
    </button>
    <a href="/api/reports/${screening.id}/card" target="_blank" class="btn btn-secondary">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      Clinical Card (PNG)
    </a>
  </div>

  <!-- ============================================================ -->
  <!-- PAGE 1: CLINICAL SUMMARY, SCREENING RESULT & FUNDUS IMAGING -->
  <!-- ============================================================ -->

  <!-- Brand Header -->
  <div class="brand-header">
    <div>
      <div class="brand-title">RETINOVA</div>
      <div class="brand-sub">AI-Assisted Diabetic Retinopathy Clinical Screening Report</div>
    </div>
    <div class="report-meta-box">
      <div class="report-id">Report ID: REP-${screeningIdDisplay}</div>
      <div class="report-date">Screening Date: ${screeningDate}</div>
    </div>
  </div>

  <!-- SECTION 1 & 2: PRIMARY CLINICAL DECISION -->
  <div class="clinical-result-card ${decision === 'REFER' ? 'card-refer' : (decision === 'RECAPTURE' ? 'card-recapture' : 'card-screen')} avoid-break">
    <div>
      <div class="result-primary-title ${decision === 'REFER' ? 'title-refer' : (decision === 'RECAPTURE' ? 'title-recapture' : 'title-screen')}">
        ${decision === 'REFER' ? 'DIABETIC RETINOPATHY: REFERRAL RECOMMENDED' : (decision === 'RECAPTURE' ? 'IMAGE QUALITY INSUFFICIENT — RECAPTURE REQUIRED' : 'NO REFERABLE DIABETIC RETINOPATHY DETECTED')}
      </div>
      <div class="result-primary-sub">
        ${decision === 'REFER' ? 'REFERABLE DR (G2+)' : (decision === 'RECAPTURE' ? 'OPTICAL QUALITY RECAPTURE REQUIRED' : 'NON-REFERABLE (ROUTINE ANNUAL SCREENING)')}
      </div>
      <div class="result-details">
        ${!isRejected && typeof pCalibrated === 'number' ? `
          <div style="margin-bottom: 4px;">
            <span class="prob-tag">Primary Referral Probability</span>
            <strong>Calibrated referral probability: ${pCalibratedDisplay}</strong>
          </div>
          <div>
            <span class="prob-tag">Predicted Severity</span>
            <strong>${grade !== null && gradeLabels[grade] ? gradeLabels[grade] : (clf.grade_label || 'Not graded')}</strong>
          </div>
        ` : `
          Optical quality criteria not met. Downstream AI grading halted.<br/>
          Recapture the affected eye before screening.
        `}
      </div>
    </div>
    <div>
      <div class="badge-dominant ${decision === 'REFER' ? 'badge-refer' : (decision === 'RECAPTURE' ? 'badge-recapture' : 'badge-screen')}">
        ${decision}
      </div>
    </div>
  </div>

  <!-- SECTION 1: PATIENT & ENCOUNTER INFORMATION -->
  <div class="content-box avoid-break">
    <div class="section-title">Patient & Encounter Information</div>
    <div class="grid-meta">
      ${patientCode ? `
      <div class="meta-item">
        <span class="meta-label">Patient ID</span>
        <span class="meta-value">${patientCode}</span>
      </div>` : ''}
      ${patientName ? `
      <div class="meta-item">
        <span class="meta-label">Patient Name</span>
        <span class="meta-value">${patientName}</span>
      </div>` : ''}
      ${patientAge ? `
      <div class="meta-item">
        <span class="meta-label">Age</span>
        <span class="meta-value">${patientAge}</span>
      </div>` : ''}
      ${patientSex ? `
      <div class="meta-item">
        <span class="meta-label">Sex</span>
        <span class="meta-value">${patientSex}</span>
      </div>` : ''}
      ${eyeImagedLabel ? `
      <div class="meta-item">
        <span class="meta-label">Eye Imaged</span>
        <span class="meta-value">${eyeImagedLabel}</span>
      </div>` : ''}
      ${screeningCentre ? `
      <div class="meta-item">
        <span class="meta-label">Screening Centre</span>
        <span class="meta-value">${screeningCentre}</span>
      </div>` : ''}
      ${technician ? `
      <div class="meta-item">
        <span class="meta-label">Screening Operator</span>
        <span class="meta-value">${technician}</span>
      </div>` : ''}
      ${cameraDevice ? `
      <div class="meta-item">
        <span class="meta-label">Device</span>
        <span class="meta-value">${cameraDevice}</span>
      </div>` : ''}
      <div class="meta-item">
        <span class="meta-label">Screening Date</span>
        <span class="meta-value">${screeningDate}</span>
      </div>
      ${encounterNotes ? `
      <div class="meta-item" style="grid-column: 1 / -1;">
        <span class="meta-label">Notes</span>
        <span class="meta-value">${encounterNotes}</span>
      </div>` : ''}
    </div>
  </div>

  <!-- SECTION 3: IMAGE QUALITY GATE -->
  <div class="content-box avoid-break">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <div class="section-title" style="margin-bottom: 0;">Image Quality Assessment</div>
      <span class="qg-status-pill ${qualityStatus === 'ACCEPTED' ? 'qg-pass' : 'qg-fail'}">
        Quality: ${qualityStatus}
      </span>
    </div>
    <div class="grid-meta">
      <div class="meta-item">
        <span class="meta-label">Quality Score</span>
        <span class="meta-value">${qualityScore}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Retinal FOV Coverage</span>
        <span class="meta-value">${fovCoverage}</span>
      </div>
      <div class="meta-item">
        <span class="meta-label">Major Artifact</span>
        <span class="meta-value">${artifactStatus === 'No Major Artifact' ? 'No' : 'Yes'}</span>
      </div>
    </div>
    <div style="font-size: 11.5px; color: #5C6672; margin-top: 8px;">
      ${qualityExplanation}
    </div>
  </div>

  <!-- SECTION 4: FUNDUS IMAGING (ORIGINAL & ENHANCED) -->
  <div class="content-box avoid-break">
    <div class="section-title">Fundus Imaging</div>
    <div class="grid-2">
      <!-- ORIGINAL FUNDUS -->
      <div class="artifact-card" style="margin-bottom: 0;">
        <div class="artifact-header">
          <span>Original Fundus Image</span>
          <span style="font-size: 11px; color: #5C6672; font-weight: 600;">Input</span>
        </div>
        <div class="artifact-body">
          ${originalSrc ? `<img src="${originalSrc}" alt="Original Fundus" class="artifact-img" />` : '<div style="color:#64748b; padding: 60px 0;">Image Unavailable</div>'}
        </div>
      </div>

      <!-- ENHANCED FUNDUS -->
      <div class="artifact-card" style="margin-bottom: 0;">
        <div class="artifact-header">
          <span>Enhanced Fundus Image</span>
          <span style="font-size: 11px; color: #1B6357; font-weight: 600;">CLAHE</span>
        </div>
        <div class="artifact-body">
          ${!isRejected && enhancedSrc ? `<img src="${enhancedSrc}" alt="Enhanced Fundus" class="artifact-img" />` : (isRejected ? `<div style="color:#cbd5e1; padding: 60px 0; font-size: 13px;">Halted at Quality Gate</div>` : '<div style="color:#64748b; padding: 60px 0;">Enhanced Image Unavailable</div>')}
        </div>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- ============================================================ -->
  <!-- PAGE 2: AI EVIDENCE, KEY FINDINGS, NV & CLINICAL ACTION     -->
  <!-- ============================================================ -->

  <!-- SECTION 5: AI EXPLANATION / EVIDENCE -->
  <div class="content-box avoid-break">
    <div class="section-title">${decision === 'REFER' ? 'Why Did RETINOVA Flag This Image?' : (decision === 'SCREEN' ? 'Why Did RETINOVA Not Flag This Image?' : 'Why Was AI Screening Halted?')}</div>

    <!-- Grad-CAM -->
    <div class="artifact-card">
      <div class="artifact-header">
        <span>Grad-CAM Spatial Attribution</span>
        <span style="font-size: 11px; color: #1B6357; font-weight: 600;">Receptive Field Focus</span>
      </div>
      <div class="artifact-body">
        ${!isRejected && gradcamSrc ? `<img src="${gradcamSrc}" alt="Grad-CAM Overlay" class="artifact-img" />` : (isRejected ? `<div style="color:#cbd5e1; padding: 60px 0; font-size: 13px;">Halted at Quality Gate</div>` : '<div style="color:#64748b; padding: 60px 0;">Grad-CAM Unavailable</div>')}
      </div>
      <div class="artifact-footer">
        Areas contributing most strongly to the model prediction.
      </div>
    </div>

    <div class="grid-2">
      <!-- Retinal Vessel Evidence -->
      <div class="artifact-card" style="margin-bottom: 0;">
        <div class="artifact-header">
          <span>Retinal Vessel Evidence</span>
          <span style="font-size: 11px; color: #1B6357; font-weight: 600;">Coverage: ${vesselCoverage}</span>
        </div>
        <div class="artifact-body">
          ${!isRejected && vesselSrc ? `<img src="${vesselSrc}" alt="Vessel Evidence" class="artifact-img" />` : (isRejected ? `<div style="color:#cbd5e1; padding: 60px 0; font-size: 13px;">Halted at Quality Gate</div>` : '<div style="color:#64748b; padding: 60px 0;">Vessel Map Unavailable</div>')}
        </div>
        <div class="artifact-footer">
          <strong>Vessel Coverage:</strong> ${vesselCoverage} | Morphological vascular network segmented for vascular context.
        </div>
      </div>

      <!-- Candidate Lesion Evidence -->
      <div class="artifact-card" style="margin-bottom: 0;">
        <div class="artifact-header">
          <span>Candidate Lesion Evidence</span>
          <span style="font-size: 11px; color: #C1652F; font-weight: 600;">${candidateCount} Candidates</span>
        </div>
        <div class="artifact-body">
          ${!isRejected && lesionSrc ? `<img src="${lesionSrc}" alt="Candidate Lesion Map" class="artifact-img" />` : (isRejected ? `<div style="color:#cbd5e1; padding: 60px 0; font-size: 13px;">Halted at Quality Gate</div>` : '<div style="color:#64748b; padding: 60px 0;">Lesion Map Unavailable</div>')}
        </div>
        <div class="artifact-footer">
          <strong>Total Candidates:</strong> ${candidateCount} (MA: ${maCandidates ?? '--'}, HE: ${heCandidates ?? '--'}, EX: ${exCandidates ?? '--'}, SE: ${seCandidates ?? '--'})<br/>
          <span style="font-size: 11px; color: #5C6672; display: block; margin-top: 2px;">
            * Candidate lesion evidence generated by morphological analysis for clinician review. These regions are not independent diagnostic proof.
          </span>
        </div>
      </div>
    </div>

    <!-- Composite Retinal Abnormality Map -->
    ${!isRejected && retinalEvidenceSrc ? `
    <div class="artifact-card avoid-break" style="margin-top: 16px; margin-bottom: 0;">
      <div class="artifact-header" style="background: #0f172a; color: #38bdf8;">
        <span>Composite Retinal Abnormality Map</span>
        <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">Multi-Layer Evidence Overlay</span>
      </div>
      <div class="artifact-body">
        <img src="${retinalEvidenceSrc}" alt="Retinal Abnormality Map" class="artifact-img" />
      </div>
      <div class="artifact-footer">
        <div style="display: flex; gap: 14px; flex-wrap: wrap; font-size: 11.5px; margin-bottom: 4px;">
          <span><strong style="color: #06b6d4;">■ Cyan:</strong> Retinal Vessels</span>
          <span><strong style="color: #eab308;">■ Yellow:</strong> Hard Exudates (EX)</span>
          <span><strong style="color: #ef4444;">■ Red:</strong> Microaneurysms (MA)</span>
          <span><strong style="color: #d946ef;">■ Magenta:</strong> Hemorrhages (HE)</span>
          <span><strong style="color: #22c55e;">■ Green:</strong> Optic Disc Contour</span>
          <span><strong style="color: #3b82f6;">✚ Blue:</strong> Fovea Center</span>
        </div>
      </div>
    </div>
    ` : ''}
  </div>

  <!-- SECTION 6: KEY FINDINGS -->
  <div class="findings-box avoid-break">
    <div style="font-weight: 800; color: #14202E; text-transform: uppercase; font-size: 12px; letter-spacing: 0.5px;">
      Key Findings
    </div>
    <ul class="findings-list">
      ${!isRejected ? `
        <li><strong>Referable DR Classification:</strong> ${grade !== null && gradeLabels[grade] ? gradeLabels[grade] : (clf.grade_label || 'Not graded')} (${decision === 'REFER' ? 'Referral Indicated' : 'Non-Referable'})</li>
        ${parseInt(candidateCount) > 0 ? `<li><strong>Candidate Retinal Abnormalities:</strong> Detected (${candidateCount} morphological candidate regions identified)</li>` : '<li><strong>Candidate Retinal Abnormalities:</strong> No prominent morphological candidate lesions detected</li>'}
        ${exCandidates ? `<li><strong>Candidate Hard Exudates (EX):</strong> ${exCandidates} candidates identified ${csmeRisk ? '(Macular proximity flagged for clinician review)' : ''}</li>` : ''}
        ${maCandidates ? `<li><strong>Candidate Microaneurysms (MA):</strong> ${maCandidates} punctate candidates identified</li>` : ''}
        ${heCandidates ? `<li><strong>Candidate Hemorrhages (HE):</strong> ${heCandidates} candidate hemorrhages identified</li>` : ''}
        <li><strong>Retinal Vascular Evidence:</strong> Vascular tree segmented with ${vesselCoverage} coverage</li>
        <li><strong>Dedicated Neovascularization Assessment:</strong> Unavailable (no validated pixel detector)</li>
      ` : `
        <li><strong>Optical Quality:</strong> Retinal image failed quality gate criteria (${qualityScore}). AI grading halted.</li>
        <li><strong>Recapture Required:</strong> Immediate re-acquisition recommended.</li>
      `}
    </ul>
  </div>

  <!-- SECTION 7: NEOVASCULARIZATION ASSESSMENT -->
  <div class="content-box avoid-break">
    <div class="section-title">Neovascularization Assessment</div>
    <div style="font-size: 13px; font-weight: 700; color: #5C6672; margin-top: 2px;">
      Dedicated Assessment: <em>Not available</em>
    </div>
    <div style="font-size: 12px; color: #5C6672; margin-top: 4px; line-height: 1.5;">
      <strong>Reason:</strong> No dedicated validated neovascularization detector available.<br/>
      <span style="color: #9C3B3B; font-weight: 600;">Important:</span> Grade 4 classification reflects whole-image neural-network features and does not substitute for a dedicated pixel-level neovascularization assessment.
    </div>
  </div>

  <!-- SECTION 8: RECOMMENDED CLINICAL ACTION -->
  <div class="action-card ${decision === 'REFER' ? 'action-refer' : (decision === 'RECAPTURE' ? 'action-recapture' : 'action-screen')} avoid-break">
    <div style="flex: 1;">
      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #5C6672;">Recommended Clinical Action</div>
      <div style="font-size: 15px; font-weight: 800; margin-top: 2px;">
        ${clinicalAction}
      </div>
      ${referralPriority ? `<div style="font-size: 12px; color: #5C6672; margin-top: 2px;">Urgency: <strong>${referralPriority}</strong></div>` : ''}
    </div>
  </div>

  <div class="page-break"></div>

  <!-- ============================================================ -->
  <!-- PAGE 3: CLINICIAN REVIEW, DISCLAIMER & TECHNICAL APPENDIX   -->
  <!-- ============================================================ -->

  <!-- SECTION 9: CLINICAL DISPOSITION -->
  <div class="review-box avoid-break">
    <div class="section-title">Clinical Disposition</div>

    <div style="margin-top: 12px; font-size: 12px; color: #14202E; line-height: 22px;">
      <span style="display: inline-block; margin-right: 14px;">[ &nbsp; ] Referral confirmed</span>
      <span style="display: inline-block; margin-right: 14px;">[ &nbsp; ] Referral not confirmed</span>
      <span style="display: inline-block; margin-right: 14px;">[ &nbsp; ] Recapture required</span>
      <span style="display: inline-block; margin-right: 14px;">[ &nbsp; ] Clinical follow-up recommended</span>
      <span style="display: inline-block;">[ &nbsp; ] Other</span>
    </div>

    <div style="margin-top: 14px;">
      <div style="font-weight: 600; color: #5C6672; font-size: 11px; text-transform: uppercase;">Clinician Notes:</div>
      <div style="height: 40px; border-bottom: 1px dashed #cbd5e1; margin-top: 4px;"></div>
    </div>

    <div style="margin-top: 12px;">
      <div style="font-weight: 600; color: #5C6672; font-size: 11px; text-transform: uppercase;">Recommended Follow-up:</div>
      <div style="height: 22px; border-bottom: 1px dashed #cbd5e1; margin-top: 3px;"></div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px;">
      <div>
        <div style="font-weight: 600; color: #5C6672; font-size: 11px; text-transform: uppercase;">Final Clinical Grade:</div>
        <div style="height: 22px; border-bottom: 1px dashed #cbd5e1; margin-top: 3px;"></div>
      </div>
      <div>
        <div style="font-weight: 600; color: #5C6672; font-size: 11px; text-transform: uppercase;">Reviewer Name:</div>
        <div style="height: 22px; border-bottom: 1px dashed #cbd5e1; margin-top: 3px;"></div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px;">
      <div>
        <div style="font-weight: 600; color: #5C6672; font-size: 11px; text-transform: uppercase;">Registration / License Number:</div>
        <div style="height: 22px; border-bottom: 1px dashed #cbd5e1; margin-top: 3px;"></div>
      </div>
      <div>
        <div style="font-weight: 600; color: #5C6672; font-size: 11px; text-transform: uppercase;">Date:</div>
        <div style="height: 22px; border-bottom: 1px dashed #cbd5e1; margin-top: 3px;"></div>
      </div>
    </div>

    <div style="margin-top: 14px;">
      <div style="font-weight: 600; color: #5C6672; font-size: 11px; text-transform: uppercase;">Signature:</div>
      <div style="height: 32px; border-bottom: 1px solid #14202E; margin-top: 4px; width: 240px;"></div>
    </div>
  </div>

  <!-- SECTION 10: CLINICAL DISCLAIMER -->
  <div class="disclaimer avoid-break">
    <strong>Clinical Disclaimer:</strong> This AI-assisted screening output is intended to support diabetic retinopathy screening and does not constitute an independent clinical diagnosis. Final interpretation and management remain with a qualified eye-care professional.
  </div>

  <!-- SECTION 11: TECHNICAL APPENDIX (COLLAPSED BY DEFAULT) -->
  <details class="tech-details-box avoid-break no-print">
    <summary style="font-weight: 700; color: #1B6357; cursor: pointer; padding: 6px 0; font-size: 12.5px; outline: none;">
      &#9654; Technical Details & Model Diagnostics (Engineering Reference)
    </summary>
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #DCD6C9; font-size: 12px; color: #5C6672; line-height: 1.6;">
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-bottom: 12px;">
        <div><strong>Architecture:</strong> Swin V2 Tiny (Torchvision swin_v2_t)</div>
        <div><strong>Input Resolution:</strong> 512 &times; 512 &times; 3</div>
        <div><strong>Model Version:</strong> v1.0-frozen</div>
        <div><strong>Temperature Scaling:</strong> T = 1.4555</div>
        <div><strong>Operating Threshold:</strong> &tau;* = 29.93%</div>
        <div><strong>Execution:</strong> ${executionEnvironment}</div>
        <div><strong>Grad-CAM &harr; Lesion IoU:</strong> ${gradcamLesionIoUDisplay}</div>
        <div><strong>Vascular Topology:</strong> ${junctionsDisplay}</div>
      </div>

      <div style="margin-bottom: 12px; font-size: 11.5px;">
        <strong>Explainability Scale Note:</strong> Grad-CAM visualizes broad receptive-field attention (~9% of fundus, arcades/macula) for whole-image classification, whereas candidate lesions represent punctate morphological contours (&lt;1% of fundus). Low IoU is mathematically expected and does not invalidate whole-image grading.
      </div>

      ${!isRejected && rawProbabilities.length >= 5 ? `
        <div style="font-weight: 700; color: #14202E; margin-top: 12px; margin-bottom: 6px;">Secondary 5-Grade Probability Distribution:</div>
        <table class="severity-table">
          <thead>
            <tr>
              <th>Severity Grade</th>
              <th>Clinical Description</th>
              <th style="text-align: right;">Probability</th>
              <th style="width: 130px;">Distribution</th>
            </tr>
          </thead>
          <tbody>
            ${[0, 1, 2, 3, 4].map(g => {
              const prob = rawProbabilities[g] ?? 0;
              const pct = (prob * 100).toFixed(1);
              const isPredicted = (grade === g);
              return `
                <tr class="${isPredicted ? 'severity-active-row' : ''}">
                  <td><strong>Grade ${g}</strong> ${isPredicted ? '◀ (Predicted)' : ''}</td>
                  <td>${fullGradeLabels[g]}</td>
                  <td style="text-align: right; font-weight: 600;">${pct}%</td>
                  <td>
                    <div class="prob-bar-container">
                      <div class="prob-bar" style="width: ${Math.min(100, Math.max(2, parseFloat(pct)))}%; background: ${isPredicted ? '#1B6357' : '#94a3b8'};"></div>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ${closeClassificationNote ? `<div style="font-size: 11px; color: #C1652F; margin-top: 6px; font-style: italic;">${closeClassificationNote}</div>` : ''}
      ` : ''}

      <div style="margin-top: 12px;">
        <strong>Machine-Readable Evidence Artifacts:</strong>
        <a href="${evidenceJsonUrl}" target="_blank" style="color: #1B6357; text-decoration: underline; margin-right: 12px;">retinal_evidence.json</a>
        <a href="${candidatesJsonUrl}" target="_blank" style="color: #1B6357; text-decoration: underline;">lesion_candidates.json</a>
      </div>
    </div>
  </details>
</div>

</body>
</html>`;
  }
}
