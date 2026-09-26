import { Router } from 'express';
import authRoutes from './authRoutes';
import patientRoutes from './patientRoutes';
import screeningRoutes from './screeningRoutes';
import analyticsRoutes from './analyticsRoutes';
import simulationRoutes from './simulationRoutes';
import modelStatusRoutes from './modelStatusRoutes';
import reportRoutes from './reportRoutes';
import { DatabaseStore } from '../db/store';

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

const router = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.storagePath);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `fundus_upload_${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }
});

// Master Health Check reporting MATLAB Engine status
router.get('/health', async (_req, res) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const bridgeRes = await fetch(`${config.matlabAiServiceUrl}/api/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (bridgeRes.ok) {
      const data = await bridgeRes.json();
      return res.json({
        ...data,
        backend_service: 'NetraAI Express Node.js API',
        bridge_status: 'online'
      });
    }
  } catch (err: any) {
    // Return status if bridge is still warming up
  }

  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Career Crafters SIH26038 DR Screening Engine',
    matlab_engine: 'initializing',
    version: '1.0.0'
  });
});

// Real SimEvents Resource Planner endpoint
router.get('/resource-planner', async (req, res) => {
  try {
    const query = new URLSearchParams(req.query as any).toString();
    const url = `${config.matlabSimulinkServiceUrl}/api/resource-planner${query ? `?${query}` : ''}`;
    const bridgeRes = await fetch(url);
    if (bridgeRes.ok) {
      const data = await bridgeRes.json();
      return res.json(data);
    }
  } catch {
    // Direct file read fallback
    const repoRoot = path.resolve(__dirname, '../../../..');
    const jsonPath = path.join(repoRoot, 'DR_Screening_MATLAB', 'module6_Simulink', 'Module6_Resource_Planner_Results.json');
    if (fs.existsSync(jsonPath)) {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      return res.json(JSON.parse(content));
    }
  }
  return res.status(500).json({ error: 'Failed to retrieve SimEvents resource planner data' });
});

// Master Direct Screening endpoint (POST /api/screen)
router.post('/screen', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'file', maxCount: 1 }]), async (req, res) => {
  try {
    let targetImagePath = req.body?.imagePath || req.body?.imageUrl;
    
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const uploadedFile = files?.image?.[0] || files?.file?.[0];
    if (uploadedFile) {
      targetImagePath = uploadedFile.path;
    }

    const payload: any = {};
    if (targetImagePath) {
      payload.imagePath = targetImagePath;
    }
    if (req.body?.patientId) payload.patientId = req.body.patientId;
    if (req.body?.eye) payload.eye = req.body.eye;
    if (req.body?.facilityId) payload.facilityId = req.body.facilityId;

    const bridgeRes = await fetch(`${config.matlabAiServiceUrl}/api/screen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!bridgeRes.ok) {
      const err = await bridgeRes.text();
      return res.status(bridgeRes.status).json({ error: err });
    }

    const data: any = await bridgeRes.json();

    // Persist real screening record to database store
    const store = DatabaseStore.getInstance();
    const screeningId = data.screening_id || uuidv4();
    const isRejected = data.finalDecision === 'RECAPTURE' || 
      data.decision === 'RECAPTURE' || 
      data.status === 'rejected' || 
      data.quality?.qualityClass === 'Reject' ||
      data.qualityResult?.qualityClass === 'Reject';

    // Retrieve patient if patientId provided
    const patient = req.body?.patientId ? store.getPatientById(req.body.patientId) : undefined;
    const facility = (req.body?.facilityId || patient?.facility_id) ? store.getFacilityById(req.body?.facilityId || patient?.facility_id!) : undefined;

    const qualityData = data.quality || data.qualityResult;
    const enhData = data.enhancement || data.enhancementMetrics;
    const gradingData = data.grading || data.classification || data.classificationResult;
    const segData = data.segmentation || data.segmentationResult;
    const xaiData = data.explainability || data.explainabilityResult;
    const referralData = data.referral || data.referralResult;
    const finalDecision = data.finalDecision || data.decision || (isRejected ? 'RECAPTURE' : 'SCREEN');
    const totalSec = typeof data.totalTime === 'number' && data.totalTime > 0
      ? data.totalTime
      : (typeof data.pipelineTimings?.totalProcessingTimeSec === 'number' && data.pipelineTimings.totalProcessingTimeSec > 0
        ? data.pipelineTimings.totalProcessingTimeSec
        : (typeof data.pipelineTimings?.totalProcessingTimeMs === 'number'
          ? data.pipelineTimings.totalProcessingTimeMs / 1000
          : 0));
    const procTime = Math.round(totalSec * 1000);

    const screeningObj: any = {
      id: screeningId,
      patient_id: req.body?.patientId || '',
      facility_id: facility?.id || req.body?.facilityId || '',
      status: isRejected ? 'rejected' : 'completed',
      final_decision: finalDecision,
      eye: (req.body?.eye || 'left') as 'left' | 'right',
      created_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      processing_time_ms: procTime,
      patient,
      facility,
      timings: {
        iqaTime: data.iqaTime ?? qualityData?.processingTimeSec ?? 0,
        enhancementTime: data.enhancementTime ?? enhData?.processingTimeSec ?? 0,
        segmentationTime: data.segmentationTime ?? segData?.processingTimeSec ?? 0,
        gradingTime: data.gradingTime ?? gradingData?.processingTimeSec ?? 0,
        gradCAMTime: data.gradCAMTime ?? xaiData?.processingTimeSec ?? 0,
        totalTime: totalSec
      },
      quality: qualityData ? {
        id: qualityData.id || uuidv4(),
        image_id: '',
        qualityClass: qualityData.qualityClass || (isRejected ? 'Reject' : 'Good'),
        quality_score: typeof qualityData.quality_score === 'number' ? qualityData.quality_score : (typeof qualityData.qualityScore === 'number' ? qualityData.qualityScore : (qualityData.confidence ? qualityData.confidence * 100 : 0)),
        confidence: qualityData.confidence,
        decision: qualityData.decision || (isRejected ? 'RECAPTURE' : 'ACCEPT'),
        sharpness: qualityData.sharpness ?? 0,
        illumination: qualityData.illumination ?? 0,
        fov_coverage: qualityData.fov_coverage ?? (qualityData.fovCoverage ?? 0),
        artifact_area: qualityData.artifact_area ?? (qualityData.artifactArea ?? 0),
        artifact_type: qualityData.artifact_type || qualityData.artifactType || 'None',
        status: isRejected ? 'rejected' : 'accepted',
        quality_gate: isRejected ? 'reject' : 'good',
        quality_flags: qualityData.quality_flags || qualityData.qualityFlags || [],
        rejection_reason: qualityData.rejection_reason || qualityData.explanation || qualityData.rejectionReason,
        created_at: new Date().toISOString()
      } : undefined,
      enhancement: (!isRejected && enhData) ? {
        id: enhData.id || uuidv4(),
        image_id: '',
        enhanced_image_url: enhData.enhanced_image_url || enhData.enhancedImageUrl || '',
        method: enhData.method || 'Adaptive CLAHE with Green-Channel Luminance Normalization',
        originalContrast: enhData.originalContrast,
        enhancedContrast: enhData.enhancedContrast,
        contrastGain: enhData.contrastGain,
        fovCoverage: enhData.fovCoverage,
        processing_time_ms: enhData.processingTimeSec ? Math.round(enhData.processingTimeSec * 1000) : 0,
        created_at: new Date().toISOString()
      } : undefined,
      classification: (!isRejected && gradingData) ? {
        id: gradingData.id || uuidv4(),
        screening_id: screeningId,
        predicted_grade: gradingData.predicted_grade ?? gradingData.grade ?? 0,
        grade_label: gradingData.grade_label ?? gradingData.gradeLabel ?? '',
        predictedClass: gradingData.predictedClass || `Grade${gradingData.predicted_grade ?? gradingData.grade ?? 0}`,
        raw_probability: gradingData.raw_probability ?? gradingData.confidence ?? 0,
        calibrated_confidence: gradingData.calibrated_confidence ?? (gradingData.confidence ? gradingData.confidence * 100 : 0),
        classProbabilities: gradingData.classProbabilities || gradingData.grade_probabilities,
        grade_probabilities: gradingData.grade_probabilities || gradingData.classProbabilities,
        confidence_method: gradingData.confidence_method ?? 'Platt Scaling (Temperature T*=1.4555)',
        confidence_threshold: gradingData.threshold ?? 0.2993,
        threshold: gradingData.threshold ?? 0.2993,
        temperature: gradingData.temperature ?? 1.4555,
        g2plus_probability_raw: gradingData.g2plus_probability_raw ?? data.g2plus_probability_raw,
        g2plus_probability_calibrated: gradingData.g2plus_probability_calibrated ?? data.g2plus_probability_calibrated,
        referable: gradingData.referable ?? data.referable ?? (finalDecision === 'REFER'),
        decision: gradingData.decision ?? data.decision ?? (finalDecision === 'REFER' ? 'REFER' : 'SCREEN'),
        model_name: gradingData.model_name || data.model_name || 'Swin V2 Tiny (Torchvision swin_v2_t)',
        model_version: gradingData.model_version || data.model_version || 'v1.0-frozen',
        dataset_benchmark: gradingData.dataset_benchmark || 'IDRiD / APTOS / EyePACS Multi-Domain Frozen Benchmark',
        processing_time_ms: gradingData.processingTimeSec ? Math.round(gradingData.processingTimeSec * 1000) : 0,
        created_at: new Date().toISOString()
      } : undefined,
      segmentation: (!isRejected && segData) ? {
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
      } : undefined,
      explainability: (!isRejected && xaiData) ? {
        id: xaiData.id || uuidv4(),
        screening_id: screeningId,
        gradcam_url: xaiData.gradcam_url ?? '',
        status: xaiData.status || 'SUCCESS',
        featureLayer: xaiData.feature_layer || xaiData.featureLayer || 'backbone.features[5]+[7] (Multi-Scale Spatial Grad-CAM)',
        executionEnvironment: xaiData.execution_environment || xaiData.executionEnvironment || 'GPU',
        evidence_summary: xaiData.evidence_summary ?? '',
        evidence_regions: xaiData.evidence_regions || [],
        attention_focus: xaiData.attention_focus || '',
        created_at: new Date().toISOString()
      } : undefined,
      referral: {
        id: referralData?.id || uuidv4(),
        screening_id: screeningId,
        status: isRejected ? 'Recapture Recommended' : (finalDecision === 'REFER' ? 'Referral Recommended' : (finalDecision === 'SCREEN_WITH_QUALITY_FLAG' ? 'Screen (With Quality Flag)' : 'Routine Screening Complete')),
        priority: isRejected ? 'urgent' : (finalDecision === 'REFER' ? 'priority' : 'none'),
        reason: isRejected ? 'Image acquisition quality gate failed. Retinal recapture recommended.' : (referralData?.reason || (finalDecision === 'REFER' ? 'Referable Diabetic Retinopathy detected. Priority clinical referral recommended.' : 'Automated screening workflow complete.')),
        action_taken: isRejected ? 'patient_advised' : (referralData?.action_taken || 'referral_pending'),
        recommended_action: referralData?.recommended_action || (finalDecision === 'REFER' ? 'Ophthalmologist Evaluation within 2-4 weeks' : 'Annual Tele-Screening Review'),
        created_at: new Date().toISOString()
      },
      image: {
        id: uuidv4(),
        screening_id: screeningId,
        storage_url: uploadedFile ? `/uploads/${path.basename(uploadedFile.path)}` : (targetImagePath ? `/uploads/${path.basename(targetImagePath)}` : (data.imagePath ? `/uploads/${path.basename(data.imagePath)}` : '')),
        original_filename: uploadedFile ? uploadedFile.originalname : path.basename(targetImagePath || data.imagePath || ''),
        eye: (req.body?.eye || 'left') as 'left' | 'right',
        device_id: req.body?.deviceId || '',
        captured_at: new Date().toISOString(),
        width: 512,
        height: 512,
        format: path.extname(targetImagePath || data.imagePath || '').replace('.', '') || 'jpg'
      }
    };

    store.addScreening(screeningObj);
    if (screeningObj.image) {
      store.addImage(screeningObj.image);
      if (screeningObj.quality) {
        screeningObj.quality.image_id = screeningObj.image.id;
        store.addImageQuality(screeningObj.quality);
      }
      if (screeningObj.enhancement) {
        screeningObj.enhancement.image_id = screeningObj.image.id;
        store.addEnhancement(screeningObj.enhancement);
      }
      if (screeningObj.segmentation) {
        screeningObj.segmentation.image_id = screeningObj.image.id;
        store.addSegmentation(screeningObj.segmentation);
      }
    }
    if (screeningObj.classification) store.addClassification(screeningObj.classification);
    if (screeningObj.explainability) store.addExplainability(screeningObj.explainability);
    if (screeningObj.referral) store.addReferral(screeningObj.referral);

    return res.json({
      ...data,
      screening_id: screeningId
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Failed to execute MATLAB screening pipeline',
      details: err.message
    });
  }
});

// Facilities listing
router.get('/facilities', (_req, res) => {
  const store = DatabaseStore.getInstance();
  res.json({ facilities: store.getFacilities() });
});

// Mount modules
router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/screenings', screeningRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/simulation', simulationRoutes);
router.use('/model-status', modelStatusRoutes);
router.use('/reports', reportRoutes);

export default router;
