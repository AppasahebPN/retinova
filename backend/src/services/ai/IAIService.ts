import {
  AIAnalysisRequest,
  ScreeningAnalysisResult,
  ImageQualityResult,
  EnhancementResult,
  SegmentationResult,
  ClassificationResult,
  ExplainabilityResult,
  ReferralResult,
  ModuleStatus
} from '../../types';

export interface IAIInferenceService {
  /**
   * Run end-to-end multi-stage retinal screening analysis
   */
  analyzeImage(request: AIAnalysisRequest): Promise<ScreeningAnalysisResult>;

  /**
   * Run standalone image quality assessment (IQA)
   */
  assessQuality(request: { imageId: string; imagePath?: string }): Promise<ImageQualityResult>;

  /**
   * Run standalone enhancement
   */
  enhanceImage(request: { imageId: string; imagePath?: string }): Promise<EnhancementResult>;

  /**
   * Run standalone retinal vessel & lesion candidate segmentation
   */
  segmentRetina(request: { imageId: string; imagePath?: string }): Promise<SegmentationResult>;

  /**
   * Run DR Grade 0-4 classification + calibrated confidence
   */
  classifyDR(request: { imageId: string; imagePath?: string }): Promise<ClassificationResult>;

  /**
   * Generate Grad-CAM attention heatmap & evidence regions
   */
  generateGradCAM(request: { imageId: string; imagePath?: string; predictedGrade: number }): Promise<ExplainabilityResult>;

  /**
   * Generate clinical referral recommendation
   */
  determineReferral(grade: number, qualityScore: number): ReferralResult;

  /**
   * Get live health / status of AI modules
   */
  getModuleStatus(): Promise<ModuleStatus[]>;
}
