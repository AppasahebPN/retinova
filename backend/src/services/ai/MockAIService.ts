import { v4 as uuidv4 } from 'uuid';
import { IAIInferenceService } from './IAIService';
import {
  AIAnalysisRequest,
  ScreeningAnalysisResult,
  ImageQualityResult,
  EnhancementResult,
  SegmentationResult,
  ClassificationResult,
  ExplainabilityResult,
  ReferralResult,
  ModuleStatus,
  QualityGateStatus
} from '../../types';

export class MockAIService implements IAIInferenceService {
  public async analyzeImage(request: AIAnalysisRequest): Promise<ScreeningAnalysisResult> {
    const t0 = Date.now();

    const hash = this.getHash(request.imageId || request.screeningId);
    
    // Simulate real pipeline latency
    await new Promise(r => setTimeout(r, 650));

    const grade = (hash % 5) as 0 | 1 | 2 | 3 | 4;
    const eye = request.eye || 'left';

    // 1. Image Quality Assessment (EyeQ MobileNetV2 Quality Gate)
    const qualityScore = 86 + (hash % 12);
    const isGood = qualityScore >= 88;
    const qualityGate: QualityGateStatus = isGood ? 'good' : 'usable';
    const qualityFlags = [
      'Adequate Macular & Disc FOV Coverage (>90%)',
      'Sharp Vascular Margin Contrast',
      'Uniform Illumination Profile'
    ];
    if (!isGood) {
      qualityFlags.push('Quality Flag: Minor peripheral illumination gradient detected (Usable)');
    }

    const quality: ImageQualityResult = {
      id: uuidv4(),
      image_id: request.imageId,
      quality_score: qualityScore,
      sharpness: qualityScore - 2 + (hash % 3),
      illumination: qualityScore + 1 - (hash % 2),
      fov_coverage: 92.5 + (hash % 5),
      artifact_area: 2.8 + (hash % 3),
      status: 'accepted',
      quality_gate: qualityGate,
      quality_flags: qualityFlags,
      created_at: new Date().toISOString()
    };

    // 2. Image Enhancement (Illumination Equalization & Controlled CLAHE)
    const enhancement: EnhancementResult = {
      id: uuidv4(),
      image_id: request.imageId,
      enhanced_image_url: `/uploads/fundus_g${grade}_${eye}_enhanced.svg`,
      method: 'Illumination Equalization & Controlled CLAHE',
      processing_time_ms: 290 + (hash % 40),
      created_at: new Date().toISOString()
    };

    // 3. Retinal Evidence Analysis (Vessel & Lesion Candidate Evidence)
    const candidateCounts = [0, 3, 8, 19, 34];
    const lesionCoverages = [0.0, 0.42, 1.80, 4.15, 8.40];
    const segmentation: SegmentationResult = {
      id: uuidv4(),
      image_id: request.imageId,
      vessel_coverage: 14.8 + ((hash % 10) / 10),
      lesion_coverage: lesionCoverages[grade],
      candidate_count: candidateCounts[grade],
      vessel_mask_url: `/uploads/fundus_g${grade}_${eye}_vessels.svg`,
      lesion_mask_url: `/uploads/fundus_g${grade}_${eye}_lesions.svg`,
      processing_time_ms: 420 + (hash % 50),
      created_at: new Date().toISOString()
    };

    // 4. DR Severity Grading (APTOS 2019 / EyePACS MobileNetV2 Ordinal Model)
    const gradeLabels = [
      'Grade 0 — No Diabetic Retinopathy',
      'Grade 1 — Mild Non-Proliferative DR',
      'Grade 2 — Moderate Non-Proliferative DR',
      'Grade 3 — Severe Non-Proliferative DR',
      'Grade 4 — Proliferative Diabetic Retinopathy'
    ];
    const calibratedConfidences = [0.942, 0.884, 0.865, 0.912, 0.958];
    const rawProbabilities = [0.975, 0.910, 0.892, 0.945, 0.980];

    const classification: ClassificationResult = {
      id: uuidv4(),
      screening_id: request.screeningId,
      predicted_grade: grade,
      grade_label: gradeLabels[grade],
      raw_probability: rawProbabilities[grade],
      calibrated_confidence: calibratedConfidences[grade],
      confidence_method: 'Temperature Scaling + Platt Calibration (MATLAB)',
      confidence_threshold: 0.70,
      model_name: 'APTOS-MobileNetV2-DR-Ordinal',
      model_version: 'v1.4-rural-calibrated',
      dataset_benchmark: 'APTOS 2019 / EyePACS Benchmark',
      processing_time_ms: 360 + (hash % 50),
      created_at: new Date().toISOString()
    };

    // 5. Explainable AI & Grad-CAM Evidence
    const summaries = [
      'Normal retinal fundus appearance. Intact foveal avascular zone and regular vascular arcades. Zero microaneurysms, hemorrhages, or exudates detected.',
      'Mild non-proliferative DR: Saliency focus on candidate microaneurysms in parafoveal vascular zone. Minimal vascular perturbation observed.',
      'Moderate non-proliferative DR: Attention concentrated over clusters of candidate hard exudates and dot-blot hemorrhages across inferior/superior quadrants.',
      'Severe non-proliferative DR: Saliency map highlights extensive retinal hemorrhage candidates and cotton-wool spots spanning multiple quadrants.',
      'Proliferative Diabetic Retinopathy: Strong class activation over candidate neovascularization fronds and preretinal hemorrhage signatures.'
    ];

    const explainability: ExplainabilityResult = {
      id: uuidv4(),
      screening_id: request.screeningId,
      gradcam_url: `/uploads/fundus_g${grade}_${eye}_gradcam.svg`,
      evidence_summary: summaries[grade],
      attention_focus: grade === 0 ? 'Foveal Avascular Zone Architecture' : 'Retinal Micro-Vascular Lesion Cluster',
      evidence_regions: [
        {
          x: eye === 'left' ? 240 : 360,
          y: 300,
          radius: grade === 0 ? 35 : 45 + grade * 8,
          importance: grade === 0 ? 'low' : (grade >= 3 ? 'high' : 'medium'),
          feature_type: grade >= 2 ? 'lesion_candidate' : 'vessel_tortuosity',
          description: grade === 0 ? 'Normal foveal avascular zone architecture' : 'High gradient concentration over candidate retinal micro-lesions'
        }
      ],
      created_at: new Date().toISOString()
    };

    // 6. Referral Recommendation
    const referral = this.determineReferral(grade, qualityScore);
    referral.screening_id = request.screeningId;

    const totalMs = Date.now() - t0 + 1180;

    return {
      screeningId: request.screeningId,
      quality,
      enhancement,
      segmentation,
      classification,
      explainability,
      referral,
      pipelineTimings: {
        acquisitionTimeMs: 150,
        qualityAssessmentTimeMs: 180,
        enhancementTimeMs: enhancement.processing_time_ms,
        segmentationTimeMs: segmentation.processing_time_ms,
        classificationTimeMs: classification.processing_time_ms,
        explainabilityTimeMs: 240,
        reportGenerationTimeMs: 120,
        totalProcessingTimeMs: totalMs
      }
    };
  }

  public async assessQuality(request: { imageId: string }): Promise<ImageQualityResult> {
    const hash = this.getHash(request.imageId);
    const score = 88 + (hash % 10);
    return {
      id: uuidv4(),
      image_id: request.imageId,
      quality_score: score,
      sharpness: score - 2,
      illumination: score + 1,
      fov_coverage: 93.0,
      artifact_area: 2.5,
      status: 'accepted',
      quality_gate: 'good',
      quality_flags: ['Adequate FOV Coverage', 'Sharp Vascular Contrast'],
      created_at: new Date().toISOString()
    };
  }

  public async enhanceImage(request: { imageId: string }): Promise<EnhancementResult> {
    return {
      id: uuidv4(),
      image_id: request.imageId,
      enhanced_image_url: `/uploads/fundus_g1_left_enhanced.svg`,
      method: 'Illumination Equalization & Controlled CLAHE',
      processing_time_ms: 290,
      created_at: new Date().toISOString()
    };
  }

  public async segmentRetina(request: { imageId: string }): Promise<SegmentationResult> {
    return {
      id: uuidv4(),
      image_id: request.imageId,
      vessel_coverage: 15.2,
      lesion_coverage: 1.4,
      candidate_count: 7,
      vessel_mask_url: `/uploads/fundus_g1_left_vessels.svg`,
      lesion_mask_url: `/uploads/fundus_g1_left_lesions.svg`,
      processing_time_ms: 420,
      created_at: new Date().toISOString()
    };
  }

  public async classifyDR(request: { imageId: string }): Promise<ClassificationResult> {
    return {
      id: uuidv4(),
      screening_id: request.imageId,
      predicted_grade: 1,
      grade_label: 'Grade 1 — Mild Non-Proliferative DR',
      raw_probability: 0.91,
      calibrated_confidence: 0.884,
      confidence_method: 'Temperature Scaling + Platt Calibration (MATLAB)',
      confidence_threshold: 0.70,
      model_name: 'APTOS-MobileNetV2-DR-Ordinal',
      model_version: 'v1.4-rural-calibrated',
      dataset_benchmark: 'APTOS 2019 Benchmark',
      processing_time_ms: 350,
      created_at: new Date().toISOString()
    };
  }

  public async generateGradCAM(request: { imageId: string; predictedGrade: number }): Promise<ExplainabilityResult> {
    return {
      id: uuidv4(),
      screening_id: request.imageId,
      gradcam_url: `/uploads/fundus_g${request.predictedGrade}_left_gradcam.svg`,
      evidence_summary: 'Attention concentrated around candidate microaneurysms in parafoveal zone.',
      attention_focus: 'Parafoveal Vascular Zone',
      evidence_regions: [
        {
          x: 240,
          y: 300,
          radius: 40,
          importance: 'high',
          feature_type: 'lesion_candidate',
          description: 'Parafoveal gradient cluster'
        }
      ],
      created_at: new Date().toISOString()
    };
  }

  public determineReferral(grade: number, qualityScore: number): ReferralResult {
    const priorities: Array<'none' | 'routine' | 'priority' | 'urgent'> = [
      'none', 'routine', 'routine', 'priority', 'urgent'
    ];
    const statuses = [
      'No Referral' as const,
      'Routine Referral' as const,
      'Routine Referral' as const,
      'Priority Referral' as const,
      'Urgent Referral' as const
    ];
    const reasons = [
      'No diabetic retinopathy detected. Routine annual rural screening advised.',
      'Mild non-proliferative DR. Routine ophthalmic evaluation recommended within 6–12 months with glycemic monitoring.',
      'Moderate non-proliferative DR. Consultation recommended with ophthalmologist within 4–6 weeks.',
      'Severe non-proliferative DR. Priority referral to District Eye Hospital within 1–2 weeks.',
      'Proliferative Diabetic Retinopathy. High risk of visual impairment. Urgent referral for retinal specialist evaluation and laser photocoagulation assessment.'
    ];

    return {
      id: uuidv4(),
      screening_id: '',
      status: statuses[grade] || 'Routine Referral',
      priority: priorities[grade] || 'routine',
      reason: reasons[grade] || 'Follow-up clinical assessment advised.',
      action_taken: 'referral_pending',
      created_at: new Date().toISOString()
    };
  }

  public async getModuleStatus(): Promise<ModuleStatus[]> {
    const now = new Date().toISOString();
    return [
      {
        name: 'Image Quality Assessment (EyeQ Quality Gate)',
        code: 'EYEQ-MOBILENETV2-IQA',
        category: 'ai',
        status: 'connected',
        version: 'v2.1.0-EyeQ',
        latencyMs: 180,
        lastChecked: now,
        modelArchitecture: 'MobileNetV2 Transfer Learning (EyeQ Dataset)',
        benchmarkAccuracy: '94.8% Quality Gate Classification',
        description: 'Evaluates sharpness, illumination homogeneity, FOV coverage, and artifact area (Good / Usable / Reject Gate).',
        endpoints: ['POST /api/screenings/:id/analyze']
      },
      {
        name: 'Retinal Image Enhancement & Illumination Equalization',
        code: 'MATLAB-CLAHE-ENH',
        category: 'ai',
        status: 'connected',
        version: 'v1.8.4',
        latencyMs: 290,
        lastChecked: now,
        modelArchitecture: 'Controlled Adaptive CLAHE & Illumination Equalization',
        benchmarkAccuracy: 'PSNR > 34.2 dB Contrast Improvement',
        description: 'Normalizes peripheral shadow falloff and sharpens retinal vessel margins without introducing synthetic lesion artifacts.',
        endpoints: ['POST /api/screenings/:id/analyze']
      },
      {
        name: 'Retinal Vessel & Lesion Evidence Extraction',
        code: 'MATLAB-SEG-VESSEL-LESION',
        category: 'ai',
        status: 'connected',
        version: 'v3.0.1',
        latencyMs: 420,
        lastChecked: now,
        modelArchitecture: 'Multi-scale Gabor Filter & Morphological Candidate Masking',
        benchmarkAccuracy: '0.812 Dice Coefficient on Retinal Vasculature',
        description: 'Quantifies retinal vascular coverage percentage and candidate micro-lesion count/area with optic disc suppression.',
        endpoints: ['POST /api/screenings/:id/analyze']
      },
      {
        name: 'DR Classification & Calibrated Confidence',
        code: 'APTOS-MOBILENETV2-ORDINAL',
        category: 'ai',
        status: 'connected',
        version: 'v1.4.0',
        latencyMs: 360,
        lastChecked: now,
        modelArchitecture: 'MobileNetV2 Ordinal Classification + Platt Temperature Calibration',
        benchmarkAccuracy: '0.914 Quadratic Weighted Kappa (QWK) on APTOS 2019',
        description: 'Classifies DR severity (Grade 0–4) on ICDR criteria with temperature-scaled calibrated confidence intervals.',
        endpoints: ['POST /api/screenings/:id/analyze']
      },
      {
        name: 'Explainable AI & Grad-CAM Evidence Engine',
        code: 'GRADCAM-SALIENCY-XAI',
        category: 'ai',
        status: 'connected',
        version: 'v2.0.0',
        latencyMs: 240,
        lastChecked: now,
        modelArchitecture: 'Gradient-weighted Class Activation Mapping (Grad-CAM)',
        benchmarkAccuracy: 'High Visual Saliency Alignment with Retinal Lesions',
        description: 'Computes pixel-aligned attention heatmaps and bounding saliency regions explaining why the model triggered the grade.',
        endpoints: ['POST /api/screenings/:id/analyze']
      }
    ];
  }

  private getHash(str?: string): number {
    if (!str) return Math.floor(Math.random() * 100);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
