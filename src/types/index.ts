// ============================================================
// RETINOVA Unified Healthcare Platform     TypeScript Types
// Shared across: ASHA, District Manager, Reviewing Doctor
// ============================================================

// ---- Roles & Auth ----
export type UserRole = 'healthcare_worker' | 'district_manager' | 'doctor' | 'admin';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  facility_id: string;
  phone?: string;
  facility?: Facility;
}

export interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ---- Facility ----
export interface Facility {
  id: string;
  name: string;
  location?: string;
  type?: string;
  district?: string;
  cameras?: number;
  contact_number?: string;
}

// ---- Patient ----
export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone?: string;
  location: string;
  diabetes_duration_years?: number;
  facility_id: string;
  facility?: Facility;
  created_at: string;
}

export interface RegisterPatientInput {
  name: string;
  age: number;
  gender: string;
  location: string;
  phone?: string;
  diabetes_duration_years?: number;
  facility_id?: string;
}

// ---- Fundus Image ----
export interface FundusImage {
  id: string;
  screening_id: string;
  storage_url: string;
  original_filename: string;
  eye: 'left' | 'right' | string;
  device_id?: string;
  captured_at: string;
  width?: number;
  height?: number;
  format?: string;
}

// ---- Image Quality ----
export interface ImageQuality {
  id?: string;
  image_id?: string;
  screening_id?: string;
  accepted: boolean;
  quality_score?: number;
  sharpness?: number;
  illumination?: number;
  fov_coverage?: number;
  artifact_area?: number;
  artifact_type?: string;
  status?: 'accepted' | 'rejected' | string;
  quality_flags?: string[];
  rejection_reason?: string;
  created_at?: string;
}

// ---- Classification (AI grading result) ----
export interface Classification {
  id?: string;
  screening_id?: string;
  predicted_grade: 0 | 1 | 2 | 3 | 4;
  grade_label: string;
  predictedClass?: string;
  raw_probability?: number;
  calibrated_confidence: number;
  confidence_method?: string;
  confidence_threshold?: number;
  threshold?: number;
  temperature?: number;
  g2plus_probability_raw?: number;
  g2plus_probability_calibrated?: number;
  referable: boolean;
  decision: 'SCREEN' | 'REFER' | 'RECAPTURE' | 'SCREEN_WITH_QUALITY_FLAG' | string;
  model_name?: string;
  model_version?: string;
  dataset_benchmark?: string;
  processing_time_ms?: number;
  created_at?: string;
}

// ---- Module 3: Retinal Evidence & Pathology Analysis ----
export interface VesselMetrics {
  coveragePercent?: number;
  pixelCount?: number;
  density?: number;
  branchingComplexity?: number;
  junctionClusters?: number;
  vesselEndpoints?: number;
  skeletonLength?: number;
  meanCaliber?: number;
  connectivity?: number;
  topologyScale?: string;
  topologyMethod?: string;
}

export interface CandidateBreakdown {
  microaneurysmCandidates?: number;
  hemorrhageCandidates?: number;
  quadrantDistribution?: number[];
  hardExudateCandidates?: number;
  macularProximityExudates?: number;
  csmeRiskCandidateFlag?: boolean;
  softExudateCandidates?: number;
}

export interface NeovascularizationAssessment {
  status: 'detected' | 'not_detected' | 'unavailable';
  confidence?: number | null;
  regions?: any[];
  artifact?: string | null;
  method: string;
  candidateEvidence?: string;
}

export interface Segmentation {
  id?: string;
  image_id?: string;
  vessel_coverage?: number;
  vesselCoverage?: number;
  vessel_pixels?: number;
  vesselPixelCount?: number;
  vessel_density?: number;
  vesselDensity?: number;
  vessel_metrics?: VesselMetrics;
  vesselMetrics?: VesselMetrics;
  lesion_coverage?: number;
  lesionCoverage?: number;
  candidate_count?: number;
  candidateCount?: number;
  totalCandidates?: number;
  bright_lesion_count?: number;
  brightCandidates?: number;
  dark_lesion_count?: number;
  darkCandidates?: number;
  candidateBreakdown?: CandidateBreakdown;
  candidate_breakdown?: CandidateBreakdown;
  neovascularization?: NeovascularizationAssessment;
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
  processing_time_ms?: number;
  processingTimeSec?: number;
  created_at?: string;
}

// ---- Explainability (Grad-CAM) ----
export interface Explainability {
  id?: string;
  screening_id?: string;
  gradcam_url: string;
  status: string;
  featureLayer?: string;
  evidence_summary?: string;
  evidence_regions?: string[];
  attention_focus?: string;
  created_at?: string;
}

// ---- Referral ----
export type ReferralActionTaken =
  | 'referral_pending'
  | 'referral_completed'
  | 'patient_advised'
  | 'followup_scheduled';

export interface Referral {
  id: string;
  screening_id: string;
  status: string;
  priority?: 'urgent' | 'priority' | 'routine' | 'none' | string;
  reason?: string;
  action_taken?: ReferralActionTaken | string;
  action_notes?: string;
  recommended_action?: string;
  recommendedTimeframeDays?: number;
  completed_at?: string;
  created_at?: string;
}

// ---- Screening Event / Audit Trail ----
export interface ScreeningEvent {
  id: string;
  screening_id: string;
  event_type: string;
  status: string;
  user_id?: string;
  user_name?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ---- Screening Entity (Single Source of Truth) ----
export interface Screening {
  id: string;
  patient_id: string;
  facility_id: string;
  status: string;
  eye: 'left' | 'right' | string;
  notes?: string;
  created_at: string;
  processing_time_ms?: number;
  patient?: Patient;
  facility?: Facility;
  image?: FundusImage;
  quality?: ImageQuality;
  enhancement?: {
    enhanced_image_url?: string;
    method?: string;
    contrastGain?: number;
    fovCoverage?: number;
  };
  classification?: Classification;
  segmentation?: Segmentation;
  retinalEvidence?: Segmentation;
  explainability?: Explainability;
  referral?: Referral;
  events?: ScreeningEvent[];
}

// ---- API Response wrappers ----
export interface PaginatedScreenings {
  screenings: Screening[];
  total: number;
  limit: number;
  offset: number;
}

export interface PaginatedPatients {
  patients: Patient[];
  total: number;
  limit: number;
  offset: number;
}

export interface UploadImageResponse {
  storageUrl: string;
  originalFilename: string;
  size: number;
  mimetype: string;
}

// ---- Analytics & Dashboard Types ----
export interface AnalyticsKPIs {
  patientsScreened: number;
  totalScreenings: number;
  imagesAccepted: number;
  imagesRejected: number;
  referableCases: number;
  averageProcessingTimeMs: number;
  acceptanceRate: number;
}

export interface SeverityDistributionItem {
  grade: number;
  label: string;
  count: number;
  color: string;
  percentage: number;
}

export interface ReferralStatisticsItem {
  status: string;
  count: number;
  color: string;
}

export interface QualityStatistics {
  accepted: number;
  rejected: number;
  averageQualityScore: number;
  rejectionRate: number;
}

export interface PipelineStageItem {
  stage: string;
  avgTimeMs: number;
  description: string;
}

export interface VolumeHistoryItem {
  date: string;
  screened: number;
  normal: number;
  referable: number;
}

export interface AnalyticsOverview {
  kpis: AnalyticsKPIs;
  severityDistribution: SeverityDistributionItem[];
  referralStatistics: ReferralStatisticsItem[];
  qualityStatistics: QualityStatistics;
  pipelineStages: PipelineStageItem[];
  volumeHistory: VolumeHistoryItem[];
  facilities: Facility[];
}

// ---- Simulink / SimEvents Resource Planning Types ----
export interface SimulationParameters {
  title?: string;
  patientArrivalRate: number; // pts/day
  cameras: number;
  imageAcquisitionTime: number; // minutes
  qualityRejectionRate: number;
  aiProcessingTime: number; // seconds
  aiResources: number;
  doctorReviewTime: number; // minutes
  doctors: number;
  workingHours: number;
  simulationDuration: number; // days
  connectivityBandwidthMbps?: number;
  facilityId?: string;
}

export interface DailyThroughputItem {
  day: number;
  arrived: number;
  screened: number;
  referred: number;
  avgWaitMin: number;
}

export interface QueueDepthItem {
  timeHour: number;
  cameraQueue: number;
  aiQueue: number;
  doctorQueue: number;
}

export interface SimulationResult {
  id: string;
  simulationRunId: string;
  totalPatients: number;
  patientsProcessed: number;
  patientsWaiting: number;
  throughput: number;
  averageWaitingTime: number; // minutes
  maxWaitingTime: number; // minutes
  cameraUtilization: number; // %
  aiUtilization: number; // %
  doctorUtilization: number; // %
  rejectedImages: number;
  referralLoad: number;
  bottleneck: string;
  additionalResources?: {
    recommendedCameras: number;
    recommendedAiWorkers: number;
    recommendedDoctors: number;
    bandwidthSuggestionMbps: number;
    notes: string;
  };
  dailyThroughputSeries: DailyThroughputItem[];
  queueDepthSeries: QueueDepthItem[];
}

export interface SimulationRun {
  id: string;
  facility_id: string;
  title: string;
  parameters: SimulationParameters;
  status: 'completed' | 'running' | 'failed' | string;
  created_by?: string;
  created_at: string;
  completed_at?: string;
  result?: SimulationResult;
}

// ---- Screening Flow State (ASHA) ----
export interface ScreeningFlowState {
  patientId: string | null;
  patientName: string | null;
  eye: 'left' | 'right' | null;
  imageUri: string | null;
  imageStorageUrl: string | null;
  screeningId: string | null;
}

export const EMPTY_SCREENING_FLOW: ScreeningFlowState = {
  patientId: null,
  patientName: null,
  eye: null,
  imageUri: null,
  imageStorageUrl: null,
  screeningId: null,
};

// ---- Navigation Parameter Lists ----
export type RootStackParamList = {
  Login: undefined;
  AshaRoot: undefined;
  DistrictRoot: undefined;
  DoctorRoot: undefined;
};

// ASHA field navigator
export type AshaTabParamList = {
  HomeTab: undefined;
  HistoryTab: undefined;
  Settings: undefined;
};

export type AshaHomeStackParamList = {
  Home: undefined;
  PatientSearch: undefined;
  NewPatient: undefined;
  EyeSelection: { patientId: string; patientName: string };
  ImageCapture: { patientId: string; patientName: string; eye: 'left' | 'right' };
  ImagePreview: { patientId: string; patientName: string; eye: 'left' | 'right'; imageUri: string; mimeType?: string; fileName?: string };
  Processing: { patientId: string; patientName: string; eye: 'left' | 'right'; imageUri: string; mimeType?: string; fileName?: string };
  ScreeningResult: { screeningId: string };
  Evidence: { screeningId: string };
  Referral: { screeningId: string };
  SharedScreeningDetail: { screeningId: string };
};

export type AshaHistoryStackParamList = {
  History: undefined;
  ScreeningDetail: { screeningId: string };
  SharedScreeningDetail: { screeningId: string };
  Evidence: { screeningId: string };
  Referral: { screeningId: string };
};

// District Manager navigator
export type DistrictTabParamList = {
  DashboardTab: undefined;
  ScreeningsTab: undefined;
  ReferralsTab: undefined;
  ResourcePlanningTab: undefined;
  ReportsTab: undefined;
  SettingsTab: undefined;
};

export type DistrictStackParamList = {
  DistrictTabs: undefined;
  SharedScreeningDetail: { screeningId: string };
  Evidence: { screeningId: string };
};

// Reviewing Doctor navigator
export type DoctorTabParamList = {
  ReviewQueueTab: undefined;
  CasesTab: undefined;
  SettingsTab: undefined;
};

export type DoctorStackParamList = {
  DoctorTabs: undefined;
  DoctorClinicalReview: { screeningId: string };
  SharedScreeningDetail: { screeningId: string };
  Evidence: { screeningId: string };
};

// Legacy alias for backwards compatibility
export type MainTabParamList = AshaTabParamList;
export type HomeStackParamList = AshaHomeStackParamList;
export type HistoryStackParamList = AshaHistoryStackParamList;
